<?php

namespace Tests;

use App\Support\BotGuard;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Carbon;

abstract class TestCase extends BaseTestCase
{
    /** A real signed form ticket, issued `$age` seconds ago (what a person's browser would send back). */
    protected function formTicket(int $age = 20): string
    {
        $now = Carbon::getTestNow();
        Carbon::setTestNow(now()->subSeconds($age));
        try {
            return BotGuard::ticket();
        } finally {
            Carbon::setTestNow($now);
        }
    }

    /** The bot-trap fields a human submission carries: an empty honeypot and a valid ticket. */
    protected function human(array $data = [], int $age = 20): array
    {
        return ['website' => '', BotGuard::TICKET => $this->formTicket($age), ...$data];
    }
}
