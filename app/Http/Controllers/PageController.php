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

    public function notFound(): \Symfony\Component\HttpFoundation\Response
    {
        return Inertia::render('Error', ['status' => 404])->toResponse(request())->setStatusCode(404);
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
            'email' => 'required|email|max:100',
            'subject' => 'required|string|max:150',
            'message' => 'required|string|min:10|max:3000',
        ]);
        BotGuard::check($request, 'contact');

        ContactMessage::create([...$data, 'ip_address' => $request->ip()]);

        return back()->with('success', 'flash.contact_sent');
    }
}
