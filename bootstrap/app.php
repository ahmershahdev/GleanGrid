<?php

use App\Http\Middleware\EnsureEmailVerified;
use App\Http\Middleware\EnsureFarmerApproved;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetLocale;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            SecurityHeaders::class,
            SetLocale::class,
            HandleInertiaRequests::class,
        ]);
        // Third-party webhooks authenticate with their own signatures, not CSRF tokens.
        $middleware->validateCsrfTokens(except: ['webhooks/*']);
        $middleware->alias([
            'role' => EnsureRole::class,
            'farmer.approved' => EnsureFarmerApproved::class,
            'verified' => EnsureEmailVerified::class,
        ]);
        $middleware->redirectGuestsTo(fn () => route('login'));
        $middleware->redirectUsersTo(fn (Request $request) => route($request->user()->dashboardRoute()));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Friendly Inertia error pages. "Expected" errors (403/404/429) always get the
        // designed page; server errors only outside debug mode so stack traces stay useful locally.
        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            $status = $response->getStatusCode();
            $friendly = in_array($status, [403, 404, 429], true) || (! app()->hasDebugModeEnabled() && in_array($status, [500, 503], true));
            if ($friendly && ! $request->expectsJson() && $request->hasSession()) {
                return Inertia::render('Error', ['status' => $response->getStatusCode()])
                    ->toResponse($request)->setStatusCode($response->getStatusCode());
            }
            if ($response->getStatusCode() === 419) {
                return back()->with('error', 'flash.page_expired');
            }

            return $response;
        });
    })->create();
