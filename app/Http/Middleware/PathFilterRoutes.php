<?php

namespace App\Http\Middleware;

use App\Support\PathFilters;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PathFilterRoutes
{
    public function handle(Request $request, Closure $next): Response
    {
        $route = $request->route();
        $raw = (string) $route->parameter('filters', '');
        $params = PathFilters::parse($raw);
        abort_if($params === null, 404);

        $legacy = PathFilters::fromQuery($request->query());
        $routeParameters = collect($route->parameters())->except('filters')->all();

        if ($request->isMethod('GET') && ($legacy !== [] || $raw !== rawurldecode(PathFilters::segments($params)))) {
            $clean = PathFilters::url($route->getName(), array_merge($params, $legacy), $routeParameters);
            $rest = collect($request->query())->except(array_keys($legacy))->all();

            return redirect($clean.($rest ? '?'.http_build_query($rest) : ''), 301);
        }

        $route->forgetParameter('filters');
        $request->attributes->set('path_filters', $params);
        $request->query->add($params);
        $request->merge($params);

        return $next($request);
    }
}
