<?php

namespace App\Notifications\Channels;

use Illuminate\Notifications\Channels\MailChannel;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Throwable;

class SafeMailChannel extends MailChannel
{
    public function send($notifiable, Notification $notification)
    {
        try {
            return parent::send($notifiable, $notification);
        } catch (Throwable $e) {
            if (config('queue.default') !== 'sync') {
                throw $e;
            }

            Log::error('Mail delivery failed', [
                'notification' => class_basename($notification),
                'notifiable' => method_exists($notifiable, 'getKey') ? $notifiable->getKey() : null,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }
}
