<?php

namespace App\Notifications;

use App\Models\ContactMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

class ContactReply extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private ContactMessage $message, private string $reply)
    {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject('Re: '.$this->message->subject)
            ->replyTo(config('gleangrid.contact.email'), 'GleanGrid support')
            ->greeting('Salaam '.strtok($this->message->name, ' ').',');

        foreach (preg_split('/\R{2,}/', trim($this->reply)) as $paragraph) {
            $mail->line($paragraph);
        }

        return $mail
            ->line('— The GleanGrid team')
            ->line('> '.str_replace("\n", "\n> ", Str::limit($this->message->message, 600)));
    }
}
