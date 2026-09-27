<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use App\Models\FarmerProfile;
use App\Models\Market;
use App\Models\Order;
use App\Models\User;
use App\Support\BotGuard;
use App\Support\LegalContent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PageController extends Controller
{
    public function about(): Response
    {
        return Inertia::render('About', [
            'stats' => [
                'farmers' => FarmerProfile::approved()->count(),
                'customers' => User::where('role', User::ROLE_CUSTOMER)->count(),
                'markets' => Market::active()->count(),
                'orders' => Order::count(),
            ],
        ]);
    }

    private const ALIASES = [
        'home' => '', 'index' => '', 'contact-us' => 'contact', 'contactus' => 'contact', 'support' => 'contact', 'help' => 'faq',
        'faqs' => 'faq', 'about-us' => 'about', 'aboutus' => 'about', 'tos' => 'terms', 'terms-of-service' => 'terms',
        'terms-and-conditions' => 'terms', 'privacy-policy' => 'privacy', 'refund' => 'returns', 'refunds' => 'returns',
        'refund-policy' => 'returns', 'returns-policy' => 'returns', 'return-policy' => 'returns', 'pickup' => 'pickup-policy',
        'market' => 'markets', 'farmer' => 'farmers', 'product' => 'products', 'produce' => 'products', 'shop' => 'products',
        'basket' => 'cart', 'signin' => 'login', 'sign-in' => 'login', 'signup' => 'register', 'sign-up' => 'register', 'join' => 'register',
    ];

    public function notFound(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        if ($request->isMethod('GET') && ($target = $this->canonicalPath($request->path())) !== null) {
            $query = $request->getQueryString();

            return redirect('/'.$target.($query ? '?'.$query : ''), 301);
        }

        return Inertia::render('Error', ['status' => 404])->toResponse($request)->setStatusCode(404);
    }

    private function canonicalPath(string $path): ?string
    {
        $lower = mb_strtolower(trim($path, '/'));
        $target = self::ALIASES[$lower] ?? $lower;
        if ($target === trim($path, '/')) {
            return null;
        }

        try {
            $route = app('router')->getRoutes()->match(Request::create('/'.$target, 'GET'));
        } catch (\Throwable) {
            return null;
        }

        return $route->isFallback ? null : $target;
    }

    public function faq(): Response
    {
        return Inertia::render('Faq', ['groups' => LegalContent::faq()]);
    }

    public function legal(string $page): Response
    {
        return Inertia::render('Legal', [
            'page' => $page,
            'content' => LegalContent::page($page),
            'updated' => LegalContent::UPDATED,
        ]);
    }

    public function contact(): Response
    {
        return Inertia::render('Contact', ['contact' => config('gleangrid.contact')]);
    }

    public function sendContact(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email:rfc|max:100',
            'topic' => ['required', Rule::in(array_keys(ContactMessage::TOPICS))],
            'subject' => 'nullable|string|max:150|required_if:topic,other',
            'message' => 'required|string|min:10|max:3000',
        ]);
        BotGuard::check($request, 'contact');

        ContactMessage::create([
            ...$data,
            'subject' => filled($data['subject'] ?? null) ? $data['subject'] : ContactMessage::TOPICS[$data['topic']],
            'ip_address' => $request->ip(),
        ]);

        return back()->with('success', 'flash.contact_sent');
    }
}
