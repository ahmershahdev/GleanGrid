<?php

namespace App\Http\Controllers;

use App\Models\FarmerProfile;
use App\Models\Product;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('Cart');
    }

    public function sync(Request $request, OrderService $orders): JsonResponse
    {
        $data = $request->validate([
            'items' => 'array|max:100',
            'items.*.product_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1|max:999',
        ]);

        $wanted = collect($data['items'] ?? [])->keyBy('product_id');
        $products = Product::listed()->whereIn('id', $wanted->keys())
            ->with('category:id,name,slug,color')->get();

        $groups = $products->groupBy('farmer_profile_id')->map(function ($items, $farmerId) use ($wanted, $orders) {
            $farmer = FarmerProfile::find($farmerId);

            return [
                'farmer' => $farmer->only('id', 'stall_name', 'slug', 'order_cutoff_hours', 'logo_url', 'cover_url'),
                'slots' => $orders->availableSlots($farmer),
                'items' => $items->map(fn (Product $p) => [
                    'product' => $p->only('id', 'name', 'slug', 'price', 'unit', 'image_url', 'stock_quantity', 'status') + ['color' => $p->category?->color],
                    'quantity' => (int) $wanted[$p->id]['quantity'],
                    'orderable' => $p->isOrderable(),
                ])->values(),
            ];
        })->values();

        return response()->json([
            'groups' => $groups,
            'missing' => $wanted->keys()->diff($products->pluck('id'))->values(),
        ]);
    }
}
