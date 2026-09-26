<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContactMessage extends Model
{
    protected $fillable = ['name', 'email', 'subject', 'message', 'ip_address', 'source', 'external_id', 'is_read', 'reply_body', 'replied_at', 'replied_by'];

    protected function casts(): array
    {
        return ['is_read' => 'boolean', 'replied_at' => 'datetime'];
    }

    public function replier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'replied_by');
    }
}
