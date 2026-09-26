<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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

    /** E-mail a reply to whoever wrote in (form or inbound e-mail) and keep a copy on the message. */
    public function reply(Request $request, ContactMessage $message): RedirectResponse
    {
        $data = $request->validate(['reply' => 'required|string|min:5|max:5000']);

        Notification::route('mail', [$message->email => $message->name])->notify(new ContactReply($message, $data['reply']));
        $message->update(['reply_body' => $data['reply'], 'replied_at' => now(), 'replied_by' => $request->user()->id, 'is_read' => true]);

        return back()->with('success', 'flash.reply_sent');
    }

    public function read(ContactMessage $message): RedirectResponse
    {
        $message->update(['is_read' => ! $message->is_read]);

        return back();
    }
}
