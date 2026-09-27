<?php

namespace App\Http\Controllers\Farmer;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Support\ImageUpload;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate(['q' => 'nullable|string|max:80', 'status' => 'nullable|in:available,sold_out,unavailable']);

        return Inertia::render('Farmer/Products/Index', [
            'products' => $this->farmer($request)->products()->with('category:id,name,slug,color')
                ->when($filters['q'] ?? null, fn ($q, $t) => $q->where('name', 'like', "%{$t}%"))
                ->when($filters['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
                ->orderBy('name')->get(),
            'filters' => (object) $filters,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Farmer/Products/Form', $this->formData());
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $data['slug'] = Str::slug($data['name']).'-'.Str::lower(Str::random(5));
        $data['image'] = $this->storeImage($request) ?? $data['image'] ?? null;
        unset($data['remove_image']);
        $data['status'] = $data['stock_quantity'] > 0 ? $data['status'] : 'sold_out';

        $this->farmer($request)->products()->create($data);

        return redirect()->route('farmer.products.index')->with('success', 'flash.product_created');
    }

    public function edit(Request $request, Product $product): Response
    {
        $this->authorizeProduct($request, $product);

        return Inertia::render('Farmer/Products/Form', [...$this->formData(), 'product' => $product]);
    }

    public function update(Request $request, Product $product): RedirectResponse
    {
        $this->authorizeProduct($request, $product);
        $data = $this->validated($request);

        if ($path = $this->storeImage($request)) {
            $this->deleteImage($product);
            $data['image'] = $path;
        } elseif ($request->boolean('remove_image') && empty($data['image'])) {
            $this->deleteImage($product);
            $data['image'] = null;
        } elseif (empty($data['image'])) {
            unset($data['image']);
        } elseif ($data['image'] !== $product->image) {
            $this->deleteImage($product);
        }
        unset($data['remove_image']);
        if ((int) $data['stock_quantity'] === 0 && $data['status'] === 'available') {
            $data['status'] = 'sold_out';
        }

        $product->update($data);

        return redirect()->route('farmer.products.index')->with('success', 'flash.product_updated');
    }

    public function destroy(Request $request, Product $product): RedirectResponse
    {
        $this->authorizeProduct($request, $product);
        $product->delete();

        return back()->with('success', 'flash.product_deleted');
    }

    public function status(Request $request, Product $product): RedirectResponse
    {
        $this->authorizeProduct($request, $product);
        $data = $request->validate([
            'status' => 'required|in:available,sold_out,unavailable',
            'stock_quantity' => 'nullable|integer|min:0|max:100000',
        ]);

        if (isset($data['stock_quantity'])) {
            $product->stock_quantity = $data['stock_quantity'];
        }
        if ($data['status'] === 'available' && $product->stock_quantity === 0) {
            $product->stock_quantity = max(1, $product->weekly_quantity);
        }
        $product->status = $data['status'];
        $product->save();

        return back()->with('success', 'flash.product_updated');
    }

    public function applyTemplate(Request $request): RedirectResponse
    {
        $this->farmer($request)->products()->whereNull('removed_at')->where('weekly_quantity', '>', 0)->get()
            ->each(function (Product $product) {
                $product->stock_quantity = $product->weekly_quantity;
                if ($product->status === 'sold_out') {
                    $product->status = 'available';
                }
                $product->save();
            });

        return back()->with('success', 'flash.template_applied');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:100',
            'category_id' => 'required|exists:categories,id',
            'description' => 'nullable|string|max:2000',
            'price' => 'required|numeric|min:0.01|max:9999999',
            'unit' => ['required', Rule::in(Product::UNITS)],
            'stock_quantity' => 'required|integer|min:0|max:100000',
            'weekly_quantity' => 'required|integer|min:0|max:100000',
            'status' => 'required|in:available,sold_out,unavailable',
            'image' => ['nullable', 'string', 'regex:/^produce:[a-z_]+$/'],
            'upload' => ['nullable', ...ImageUpload::RULES],
            'remove_image' => 'boolean',
        ]);
    }

    private function storeImage(Request $request): ?string
    {
        return $request->hasFile('upload') ? ImageUpload::store($request->file('upload'), 'products', 'upload') : null;
    }

    private function deleteImage(Product $product): void
    {
        ImageUpload::delete($product->image);
    }

    private function formData(): array
    {
        return [
            'categories' => Category::where('is_active', true)->orderBy('sort_order')->get(['id', 'name', 'slug', 'icon']),
            'units' => Product::UNITS,
            'illustrations' => collect(File::files(public_path('images/produce')))
                ->map(fn ($f) => $f->getFilenameWithoutExtension())->sort()->values(),
        ];
    }

    private function farmer(Request $request)
    {
        return $request->user()->farmerProfile;
    }

    private function authorizeProduct(Request $request, Product $product): void
    {
        abort_unless($product->farmer_profile_id === $this->farmer($request)->id, 403);
    }
}
