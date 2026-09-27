<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ContactMessage;
use App\Notifications\ContactReply;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use Inertia\Response;

class MessageController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Messages', [
            'messages' => ContactMessage::with('replier:id,name')->latest()->paginate(20),
        ]);
    }

    public function reply(Request $request, ContactMessage $message): RedirectResponse
    {
        $data = $request->validate(['reply' => 'required|string|min:5|max:5000']);

        Notification::route('mail', [$message->email => $message->name])->notify(new ContactReply($message, $data['reply']));
        $message->update(['reply_body' => $data['reply'], 'replied_at' => now(), 'replied_by' => $request->user()->id, 'is_read' => true]);

        AuditLog::record('message.replied', "Replied to {$message->email}: {$message->subject}", $message);

        return back()->with('success', 'flash.reply_sent');
    }

    public function read(ContactMessage $message): RedirectResponse
    {
        $message->update(['is_read' => ! $message->is_read]);

        return back();
    }
}
