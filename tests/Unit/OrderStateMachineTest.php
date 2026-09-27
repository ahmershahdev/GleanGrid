<?php

namespace Tests\Unit;

use App\Models\Order;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class OrderStateMachineTest extends TestCase
{
    public static function transitions(): array
    {
        return [
            'farmer accepts a new order' => ['placed', 'accepted', true],
            'farmer declines a new order' => ['placed', 'declined', true],
            'cannot skip straight to ready' => ['placed', 'ready', false],
            'cannot complete an unaccepted order' => ['placed', 'completed', false],
            'accepted order is packed' => ['accepted', 'ready', true],
            'accepted order can still be declined' => ['accepted', 'declined', true],
            'accepted order can be a no-show' => ['accepted', 'no_show', true],
            'ready order is handed over' => ['ready', 'completed', true],
            'ready order can be a no-show' => ['ready', 'no_show', true],
            'ready order cannot go back' => ['ready', 'accepted', false],
            'completed is final' => ['completed', 'ready', false],
            'cancelled is final' => ['cancelled', 'accepted', false],
            'declined is final' => ['declined', 'placed', false],
            'no-show is final' => ['no_show', 'completed', false],
        ];
    }

    #[DataProvider('transitions')]
    public function test_only_legal_status_changes_are_allowed(string $from, string $to, bool $allowed): void
    {
        $order = (new Order)->forceFill(['status' => $from]);

        $this->assertSame($allowed, $order->canTransitionTo($to));
    }

    public function test_every_status_is_known_and_open_statuses_are_a_subset(): void
    {
        $this->assertSame([], array_diff(Order::OPEN, Order::STATUSES));
        foreach (Order::TRANSITIONS as $from => $targets) {
            $this->assertContains($from, Order::STATUSES);
            $this->assertSame([], array_diff($targets, Order::STATUSES));
        }
    }
}
