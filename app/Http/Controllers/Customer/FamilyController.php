<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\FamilyLink;
use App\Models\User;
use App\Notifications\PlatformNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class FamilyController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Customer/Family', [
            'members' => $user->familyMembers()->with('member:id,name,email')->get(),
            'memberships' => $user->familyMemberships()->with('owner:id,name,email')->get(),
        ]);
    }

    public function invite(Request $request): RedirectResponse
    {
        $data = $request->validate(['email' => 'required|email']);
        $user = $request->user();

        $member = User::where('email', $data['email'])->where('role', User::ROLE_CUSTOMER)->first();
        if (! $member || $member->id === $user->id) {
            throw ValidationException::withMessages(['email' => 'No other customer account uses that e-mail.']);
        }
        if (FamilyLink::where(fn ($q) => $q->where('owner_id', $user->id)->where('member_id', $member->id))
            ->orWhere(fn ($q) => $q->where('owner_id', $member->id)->where('member_id', $user->id))->exists()) {
            throw ValidationException::withMessages(['email' => 'You are already linked with this person.']);
        }

        FamilyLink::create(['owner_id' => $user->id, 'member_id' => $member->id]);
        $member->notify(new PlatformNotification('family_invite', ['owner' => $user->name], route('customer.family.index'), true));

        return back()->with('success', 'flash.family_invited');
    }

    public function accept(Request $request, FamilyLink $link): RedirectResponse
    {
        abort_unless($link->member_id === $request->user()->id, 403);
        $link->update(['status' => 'accepted']);
        $link->owner->notify(new PlatformNotification('family_accepted', ['member' => $request->user()->name], route('customer.family.index')));

        return back()->with('success', 'flash.family_joined');
    }

    public function destroy(Request $request, FamilyLink $link): RedirectResponse
    {
        abort_unless(in_array($request->user()->id, [$link->owner_id, $link->member_id], true), 403);
        $link->delete();

        return back()->with('success', 'flash.family_removed');
    }
}
