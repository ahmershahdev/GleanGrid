<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && ! $request->user()->hasVerifiedEmail()) {
            return $request->isMethod('GET')
                ? redirect()->guest(route('verification.notice'))
                : redirect()->route('verification.notice')->with('error', 'flash.verify_first');
        }

        return $next($request);
    }
}
