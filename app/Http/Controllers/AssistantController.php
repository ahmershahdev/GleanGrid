<?php

namespace App\Http\Controllers;

use App\Services\AssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssistantController extends Controller
{
    public function __invoke(Request $request, AssistantService $assistant): JsonResponse
    {
        $data = $request->validate(['message' => 'required|string|max:300']);

        return response()->json($assistant->answer($data['message'], $request->user()));
    }
}
