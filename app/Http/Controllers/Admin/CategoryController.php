<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Categories', [
            'categories' => Category::withCount('products')->orderBy('sort_order')->get(),
            'illustrations' => collect(File::files(public_path('images/produce')))
                ->map(fn ($f) => $f->getFilenameWithoutExtension())->sort()->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $data['slug'] = Str::slug($data['name']);
        Category::create($data);

        return back()->with('success', 'flash.category_saved');
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        $category->update($this->validated($request, $category));

        return back()->with('success', 'flash.category_saved');
    }

    public function destroy(Category $category): RedirectResponse
    {
        if ($category->products()->withTrashed()->exists()) {
            return back()->with('error', 'flash.category_in_use');
        }
        $category->delete();

        return back()->with('success', 'flash.category_deleted');
    }

    private function validated(Request $request, ?Category $category = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:60', Rule::unique('categories')->ignore($category)],
            'icon' => 'nullable|string|max:60',
            'color' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'description' => 'nullable|string|max:255',
            'sort_order' => 'required|integer|min:0|max:999',
            'is_active' => 'boolean',
        ]);
    }
}
