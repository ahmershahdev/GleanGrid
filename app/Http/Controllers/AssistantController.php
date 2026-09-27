<?php

namespace App\Http\Controllers;

use App\Services\AssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AssistantController extends Controller
{
    public function __invoke(Request $request, AssistantService $assistant): JsonResponse
    {
        $data = $request->validate([
            'intent' => ['required', 'string', Rule::in(AssistantService::intents())],
            'topic' => ['nullable', 'string', Rule::in(AssistantService::TOPICS)],
            'cart' => 'nullable|array|max:60',
            'cart.*.id' => 'required|integer|min:1',
            'cart.*.quantity' => 'required|integer|min:1|max:999',
        ]);

        return response()->json($assistant->answer($data['intent'], $request->user(), [
            'topic' => $data['topic'] ?? null,
            'cart' => $data['cart'] ?? [],
        ]));
    }
}
