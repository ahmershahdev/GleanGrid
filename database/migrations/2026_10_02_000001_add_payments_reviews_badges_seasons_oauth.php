<?php

use App\Support\SchemaCompat;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const CHECKS = [
        'payments' => [
            'chk_payment_status' => "status IN ('pending','processing','paid','failed','expired','refunded','partially_refunded')",
            'chk_payment_method' => "method IN ('easypaisa','jazzcash','card')",
            'chk_payment_amount' => 'amount > 0 AND refunded_amount >= 0 AND refunded_amount <= amount',
            'chk_payment_attempts' => 'attempts <= 20',
        ],
        'orders' => [
            'chk_order_payment_method' => "payment_method IN ('cash','easypaisa','jazzcash','card')",
            'chk_order_payment_status' => "payment_status IN ('unpaid','pending','paid','refunded','failed')",
        ],
        'farmer_badges' => [
            'chk_badge_key' => "badge IN ('top_rated','reliable','rising_star','customer_favourite')",
            'chk_badge_source' => "source IN ('auto','manual')",
        ],
        'product_price_history' => [
            'chk_price_history_price' => 'price >= 0',
        ],
        'social_accounts' => [
            'chk_social_provider' => "provider IN ('google','facebook')",
        ],
    ];

    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 24)->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('method', 20);
            $table->string('provider', 20)->default('sandbox');
            $table->string('status', 20)->default('pending');
            $table->decimal('amount', 10, 2);
            $table->decimal('refunded_amount', 10, 2)->default(0);
            $table->char('currency', 3)->default('PKR');
            $table->string('provider_ref', 64)->nullable()->unique();
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->string('card_brand', 20)->nullable();
            $table->char('card_last4', 4)->nullable();
            $table->string('wallet_msisdn', 20)->nullable();
            $table->string('failure_reason', 160)->nullable();
            $table->dateTime('expires_at');
            $table->dateTime('processing_started_at')->nullable();
            $table->dateTime('paid_at')->nullable();
            $table->dateTime('failed_at')->nullable();
            $table->dateTime('refunded_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'status']);
            $table->index(['status', 'expires_at']);
            $table->index('created_at');
        });

        Schema::create('payment_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 30);
            $table->string('status', 20);
            $table->string('message', 190)->nullable();
            $table->string('idempotency_key', 64)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->dateTime('created_at')->useCurrent();
            $table->unique(['payment_id', 'idempotency_key'], 'payment_events_idempotency');
            $table->index(['payment_id', 'created_at']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('payment_id')->nullable()->after('coupon_code')->constrained()->nullOnDelete();
            $table->string('payment_method', 20)->default('cash')->after('payment_id');
            $table->string('payment_status', 20)->default('unpaid')->after('payment_method');
            $table->index(['payment_status', 'status'], 'orders_payment_state');
        });

        Schema::create('review_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->unsignedSmallInteger('width')->nullable();
            $table->unsignedSmallInteger('height')->nullable();
            $table->unsignedTinyInteger('sort')->default(0);
            $table->boolean('is_hidden')->default(false);
            $table->timestamps();
            $table->index(['review_id', 'is_hidden', 'sort']);
        });

        Schema::create('product_price_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->decimal('price', 10, 2);
            $table->date('recorded_on');
            $table->unique(['product_id', 'recorded_on']);
            $table->index('recorded_on');
        });

        Schema::create('seasonal_produce', function (Blueprint $table) {
            $table->id();
            $table->string('name', 80);
            $table->string('slug', 100)->unique();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('image', 60)->nullable();
            $table->json('months');
            $table->json('peak_months')->nullable();
            $table->string('search', 60)->nullable();
            $table->string('notes', 255)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('farmer_badges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farmer_profile_id')->constrained()->cascadeOnDelete();
            $table->string('badge', 30);
            $table->string('source', 10)->default('auto');
            $table->boolean('locked')->default(false);
            $table->string('reason', 190)->nullable();
            $table->json('metrics')->nullable();
            $table->foreignId('awarded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('awarded_at');
            $table->dateTime('revoked_at')->nullable();
            $table->foreignId('revoked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['farmer_profile_id', 'badge']);
            $table->index(['badge', 'revoked_at']);
        });

        Schema::create('stock_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->dateTime('notified_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'product_id']);
            $table->index(['product_id', 'notified_at']);
        });

        Schema::create('social_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 20);
            $table->string('provider_user_id', 191);
            $table->string('email', 100)->nullable();
            $table->dateTime('last_used_at')->nullable();
            $table->timestamps();
            $table->unique(['provider', 'provider_user_id']);
            $table->unique(['user_id', 'provider']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 30)->nullable()->change();
            $table->text('address')->nullable()->change();
            $table->string('password')->nullable()->change();
        });

        DB::table('settings')->insertOrIgnore(collect([
            'payments_cash_enabled' => '1',
            'payments_easypaisa_enabled' => '1',
            'payments_jazzcash_enabled' => '1',
            'payments_card_enabled' => '1',
            'payment_window_minutes' => '20',
            'badge_prior_weight' => '5',
            'badge_top_rated_min_score' => '4.5',
            'badge_top_rated_min_reviews' => '5',
            'badge_reliable_min_orders' => '10',
            'badge_reliable_min_rate' => '95',
            'badge_rising_days' => '120',
            'badge_favourite_min' => '10',
        ])->map(fn ($value, $key) => ['key' => $key, 'value' => $value, 'created_at' => now(), 'updated_at' => now()])->values()->all());

        if ($this->supportsChecks()) {
            foreach (self::CHECKS as $table => $checks) {
                foreach ($checks as $name => $expr) {
                    DB::statement("ALTER TABLE `{$table}` ADD CONSTRAINT `{$name}` CHECK ({$expr})");
                }
            }
        }
    }

    public function down(): void
    {
        if ($this->supportsChecks()) {
            foreach (['orders' => self::CHECKS['orders']] as $table => $checks) {
                foreach (array_keys($checks) as $name) {
                    SchemaCompat::dropCheck($table, $name);
                }
            }
        }

        DB::table('settings')->whereIn('key', [
            'payments_cash_enabled', 'payments_easypaisa_enabled', 'payments_jazzcash_enabled', 'payments_card_enabled', 'payment_window_minutes',
            'badge_prior_weight', 'badge_top_rated_min_score', 'badge_top_rated_min_reviews', 'badge_reliable_min_orders',
            'badge_reliable_min_rate', 'badge_rising_days', 'badge_favourite_min',
        ])->delete();

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_payment_state');
            $table->dropConstrainedForeignId('payment_id');
            $table->dropColumn(['payment_method', 'payment_status']);
        });

        foreach (['social_accounts', 'stock_alerts', 'farmer_badges', 'seasonal_produce', 'product_price_history', 'review_photos', 'payment_events', 'payments'] as $table) {
            Schema::dropIfExists($table);
        }
    }

    private function supportsChecks(): bool
    {
        return in_array(DB::getDriverName(), ['mysql', 'mariadb', 'pgsql'], true);
    }
};
