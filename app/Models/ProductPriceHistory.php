<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductPriceHistory extends Model
{
    public $timestamps = false;

    protected $table = 'product_price_history';

    protected $fillable = ['product_id', 'price', 'recorded_on'];

    protected function casts(): array
    {
        return ['price' => 'float', 'recorded_on' => 'date:Y-m-d'];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
