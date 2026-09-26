<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    public $timestamps = false;

    protected $fillable = ['generated_by', 'report_type', 'filters', 'summary', 'generated_at'];

    protected function casts(): array
    {
        return ['filters' => 'array', 'summary' => 'array', 'generated_at' => 'datetime'];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'generated_by');
    }
}
