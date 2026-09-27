<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProfileComplete
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->needsOnboarding()) {
            return $request->isMethod('GET')
                ? redirect()->guest(route('onboarding.show'))
                : redirect()->route('onboarding.show')->with('error', 'flash.finish_profile');
        }

        return $next($request);
    }
}
