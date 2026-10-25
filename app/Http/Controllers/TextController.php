<?php

namespace App\Http\Controllers;

use App\Support\LlmsText;
use Illuminate\Http\Response;

/** Crawler-facing plain-text files, generated so every link follows APP_URL instead of a hard-coded domain. */
class TextController extends Controller
{
    public function robots(): Response
    {
        return $this->text(view('text.robots')->render());
    }

    public function llms(): Response
    {
        return $this->text(LlmsText::cached()['summary']);
    }

    public function llmsFull(): Response
    {
        return $this->text(LlmsText::cached()['full']);
    }

    private function text(string $body): Response
    {
        return response($body, 200, [
            'Content-Type' => 'text/plain; charset=UTF-8',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
