<?php

use App\Http\Middleware\EnsureEmailVerified;
use App\Http\Middleware\EnsureFarmerApproved;
use App\Http\Middleware\EnsureProfileComplete;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\PathFilterRoutes;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetLocale;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        if ($proxies = env('TRUSTED_PROXIES')) {
            $middleware->trustProxies(at: $proxies === '*' ? '*' : array_map('trim', explode(',', $proxies)));
        }
        $middleware->web(append: [
            ThrottleRequests::using('global'),
            SecurityHeaders::class,
            SetLocale::class,
            HandleInertiaRequests::class,
        ]);
        $middleware->validateCsrfTokens(except: ['webhooks/resend/inbound', 'payments/callback/*']);
        $middleware->alias([
            'role' => EnsureRole::class,
            'farmer.approved' => EnsureFarmerApproved::class,
            'verified' => EnsureEmailVerified::class,
            'onboarded' => EnsureProfileComplete::class,
            'filters' => PathFilterRoutes::class,
        ]);
        $middleware->redirectGuestsTo(fn () => route('login'));
        $middleware->redirectUsersTo(fn (Request $request) => route($request->user()->dashboardRoute()));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontFlash(['current_password', 'password', 'password_confirmation', 'card_number', 'card_cvc', 'card_expiry', 'card_name', 'msisdn']);
        $exceptions->map(UniqueConstraintViolationException::class, function (UniqueConstraintViolationException $e) {
            $field = collect(['email', 'username', 'code', 'slug', 'stall_name', 'name'])->first(fn ($f) => str_contains($e->getMessage(), $f)) ?? 'form';

            return ValidationException::withMessages([$field => __('validation.unique', ['attribute' => str_replace('_', ' ', $field)])]);
        });
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
