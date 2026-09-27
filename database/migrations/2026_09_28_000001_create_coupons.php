<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farmer_profile_id')->constrained()->cascadeOnDelete();
            $table->string('code', 30)->unique();
            $table->string('description', 160)->nullable();
            $table->string('type', 10);
            $table->decimal('value', 10, 2);
            $table->decimal('min_subtotal', 10, 2)->default(0);
            $table->decimal('max_discount', 10, 2)->nullable();
            $table->unsignedInteger('usage_limit')->nullable();
            $table->unsignedSmallInteger('per_customer_limit')->default(1);
            $table->unsignedInteger('used_count')->default(0);
            $table->dateTime('starts_at')->nullable();
            $table->dateTime('ends_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['farmer_profile_id', 'is_active']);
        });

        Schema::create('coupon_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coupon_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('discount_amount', 10, 2);
            $table->timestamp('created_at')->useCurrent();
            $table->index(['coupon_id', 'user_id']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('subtotal', 10, 2)->nullable()->after('status');
            $table->decimal('discount_amount', 10, 2)->default(0)->after('subtotal');
            $table->string('coupon_code', 30)->nullable()->after('discount_amount');
        });
        DB::table('orders')->whereNull('subtotal')->update(['subtotal' => DB::raw('total_amount')]);

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE coupons ADD CONSTRAINT chk_coupon_type CHECK (type IN ('percent','fixed'))");
            DB::statement('ALTER TABLE coupons ADD CONSTRAINT chk_coupon_value CHECK (value > 0 AND (type <> \'percent\' OR value <= 100))');
            DB::statement('ALTER TABLE coupons ADD CONSTRAINT chk_coupon_window CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)');
            DB::statement('ALTER TABLE coupons ADD CONSTRAINT chk_coupon_usage CHECK (usage_limit IS NULL OR used_count <= usage_limit)');
            DB::statement('ALTER TABLE orders ADD CONSTRAINT chk_order_discount CHECK (discount_amount >= 0)');
        }
    }

    public function down(): void
    {
        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_order_discount');
        }
        Schema::table('orders', fn (Blueprint $t) => $t->dropColumn(['subtotal', 'discount_amount', 'coupon_code']));
        Schema::dropIfExists('coupon_redemptions');
        Schema::dropIfExists('coupons');
    }
};
