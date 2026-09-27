<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactMessage extends Model
{
    public const TOPICS = [
        'order' => 'Order help',
        'sell' => 'Selling on GleanGrid',
        'partner' => 'Partnership',
        'feedback' => 'Feedback',
        'other' => 'General enquiry',
    ];

    protected $fillable = ['name', 'email', 'topic', 'subject', 'message', 'ip_address', 'source', 'external_id', 'is_read', 'reply_body', 'replied_at', 'replied_by'];

    protected function casts(): array
    {
        return ['is_read' => 'boolean', 'replied_at' => 'datetime'];
    }

    public function replier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'replied_by');
    }
}
