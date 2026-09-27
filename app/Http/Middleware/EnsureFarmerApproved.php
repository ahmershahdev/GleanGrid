<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureFarmerApproved
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()->farmerProfile?->isApproved()) {
            return redirect()->route('farmer.dashboard')
                ->with('error', 'flash.farmer_not_approved');
        }

        return $next($request);
    }
}
