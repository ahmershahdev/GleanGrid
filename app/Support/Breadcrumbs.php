<?php

namespace App\Support;

use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Routing\Route;

class Breadcrumbs
{
    private const PUBLIC = [
        'markets.index' => [['nav.markets', 'Markets', 'markets.index']],
        'farmers.index' => [['nav.farmers', 'Farmers', 'farmers.index']],
        'products.index' => [['nav.produce', 'Produce', 'products.index']],
        'about' => [['nav.about', 'About', 'about']],
        'contact' => [['nav.contact', 'Contact', 'contact']],
        'cart' => [['nav.cart', 'Basket', 'cart']],
        'faq' => [['footer.faq', 'FAQ', 'faq']],
        'terms' => [['footer.help', 'Help', 'faq'], ['legal.terms', 'Terms', 'terms']],
        'privacy' => [['footer.help', 'Help', 'faq'], ['legal.privacy', 'Privacy', 'privacy']],
        'returns' => [['footer.help', 'Help', 'faq'], ['legal.returns', 'Returns & refunds', 'returns']],
        'pickup-policy' => [['footer.help', 'Help', 'faq'], ['legal.pickup', 'Pickup policy', 'pickup-policy']],
    ];

    private const SECTIONS = [
        'customer.orders' => ['dash.orders', 'Orders', 'customer.orders.index'],
        'customer.favorites' => ['dash.favorites', 'Favourites', 'customer.favorites.index'],
        'customer.family' => ['dash.family', 'Family sharing', 'customer.family.index'],
        'customer.reviews' => ['dash.reviews', 'Reviews', 'customer.reviews.index'],
        'customer.checkout' => ['checkout.title', 'Checkout', 'customer.checkout'],
        'farmer.orders' => ['dash.orders', 'Orders', 'farmer.orders.index'],
        'farmer.products' => ['dash.products', 'Products', 'farmer.products.index'],
        'farmer.coupons' => ['dash.coupons', 'Coupons', 'farmer.coupons.index'],
        'farmer.slots' => ['dash.pickup', 'Pickup & cut-off', 'farmer.slots.index'],
        'farmer.stall' => ['dash.stall', 'Stall profile', 'farmer.stall.edit'],
        'farmer.reviews' => ['dash.reviews', 'Reviews', 'farmer.reviews.index'],
        'farmer.scan' => ['dash.scan', 'Scan pass', 'farmer.scan'],
        'admin.audit' => ['dash.audit', 'Audit log', 'admin.audit.index'],
        'admin.settings' => ['dash.settings', 'Settings', 'admin.settings.edit'],
        'admin.farmers' => ['dash.farmers', 'Farmers', 'admin.farmers.index'],
        'admin.customers' => ['dash.customers', 'Customers', 'admin.customers.index'],
        'admin.markets' => ['dash.markets', 'Markets', 'admin.markets.index'],
        'admin.categories' => ['dash.categories', 'Categories', 'admin.categories.index'],
        'admin.coupons' => ['dash.coupons', 'Coupons', 'admin.coupons.index'],
        'admin.moderation.products' => ['dash.mod_products', 'Listings', 'admin.moderation.products'],
        'admin.moderation.reviews' => ['dash.mod_reviews', 'Review moderation', 'admin.moderation.reviews'],
        'admin.orders' => ['dash.orders', 'Orders', 'admin.orders.index'],
        'admin.reports' => ['dash.reports', 'Reports', 'admin.reports.index'],
        'admin.announcements' => ['dash.announcements', 'Announcements', 'admin.announcements.index'],
        'admin.messages' => ['dash.messages', 'Messages', 'admin.messages.index'],
        'profile' => ['dash.profile', 'Profile', 'profile.edit'],
        'notifications' => ['dash.notifications', 'Notifications', 'notifications.index'],
    ];

    public static function for(?Route $route): array
    {
        $name = $route?->getName() ?? '';
        $param = fn (string $key) => $route?->parameter($key);
        $home = self::item('nav.home', 'Home', route('home'));

        if (isset(self::PUBLIC[$name])) {
            return [$home, ...array_map(fn ($c) => self::item($c[0], $c[1], route($c[2])), self::PUBLIC[$name])];
        }

        if ($name === 'markets.show' && ($m = $param('market')) instanceof Market) {
            return [$home, self::item('nav.markets', 'Markets', route('markets.index')), self::item(null, $m->name, route('markets.show', $m))];
        }
        if ($name === 'farmers.show' && ($f = $param('farmer')) instanceof FarmerProfile) {
            return [$home, self::item('nav.farmers', 'Farmers', route('farmers.index')), self::item(null, $f->stall_name, route('farmers.show', $f))];
        }
        if ($name === 'products.show' && ($p = $param('product')) instanceof Product) {
            $p->loadMissing('category:id,name,slug');

            return array_values(array_filter([
                $home,
                self::item('nav.produce', 'Produce', route('products.index')),
                $p->category ? self::item('categories.'.$p->category->slug, $p->category->name, route('products.index', ['category' => $p->category->slug])) : null,
                self::item(null, $p->name, route('products.show', $p)),
            ]));
        }

        return self::area($name, $param);
    }

    private static function area(string $name, callable $param): array
    {
        $section = collect(self::SECTIONS)->filter(fn ($s, $prefix) => str_starts_with($name, $prefix))
            ->sortByDesc(fn ($s, $prefix) => strlen($prefix))->first();
        if (! $section) {
            return [];
        }

        $trail = [self::item('nav.dashboard', 'Dashboard', route('dashboard'))];
        $trail[] = self::item($section[0], $section[1], route($section[2]));

        $leaf = match (true) {
            str_ends_with($name, 'orders.show') && ($o = $param('order')) instanceof Order => self::item(null, $o->code, request()->url()),
            str_ends_with($name, 'orders.edit') && ($o = $param('order')) instanceof Order => self::item('order.modify', 'Modify '.$o->code, request()->url()),
            str_ends_with($name, 'products.create') => self::item('fproducts.add', 'Add product', request()->url()),
            str_ends_with($name, 'products.edit') && ($p = $param('product')) instanceof Product => self::item(null, $p->name, request()->url()),
            $name === 'admin.farmers.show' && ($f = $param('farmer')) instanceof FarmerProfile => self::item(null, $f->stall_name, request()->url()),
            $name === 'admin.markets.create' => self::item('amarkets.add', 'Add market', request()->url()),
            $name === 'admin.markets.edit' && ($m = $param('market')) instanceof Market => self::item(null, $m->name, request()->url()),
            default => null,
        };

        return $leaf ? [...$trail, $leaf] : $trail;
    }

    private static function item(?string $key, string $label, string $url): array
    {
        return ['key' => $key, 'label' => $label, 'url' => $url];
    }
}
