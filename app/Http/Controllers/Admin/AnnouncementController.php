<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AnnouncementController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Announcements', [
            'announcements' => Announcement::with('author:id,name')->latest()->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->user()->announcements()->create($this->validated($request));

        return back()->with('success', 'flash.announcement_saved');
    }

    public function update(Request $request, Announcement $announcement): RedirectResponse
    {
        $announcement->update($this->validated($request));

        return back()->with('success', 'flash.announcement_saved');
    }

    public function destroy(Announcement $announcement): RedirectResponse
    {
        $announcement->delete();

        return back()->with('success', 'flash.announcement_deleted');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => 'required|string|max:140',
            'body' => 'required|string|max:2000',
            'audience' => 'required|in:all,customers,farmers',
            'level' => 'required|in:info,success,warning',
            'is_published' => 'boolean',
            'expires_at' => 'nullable|date|after:now',
        ]);
    }
}
