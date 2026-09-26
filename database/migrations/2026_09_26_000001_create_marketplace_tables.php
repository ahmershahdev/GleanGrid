<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('markets', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 120)->unique();
            $table->text('description')->nullable();
            $table->text('address');
            $table->string('city', 80)->index();
            $table->decimal('latitude', 10, 8);
            $table->decimal('longitude', 11, 8);
            $table->string('map_provider', 30)->default('openstreetmap');
            $table->json('operating_days');
            $table->time('opens_at');
            $table->time('closes_at');
            $table->string('cover_image')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('farmer_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('stall_name', 120);
            $table->string('slug', 140)->unique();
            $table->string('contact_person', 100);
            $table->string('phone', 30);
            $table->string('email', 100);
            $table->text('address');
            $table->string('tagline', 160)->nullable();
            $table->text('bio')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->json('operating_days')->nullable();
            $table->unsignedSmallInteger('order_cutoff_hours')->default(12);
            $table->string('logo')->nullable();
            $table->string('cover_image')->nullable();
            $table->string('status', 20)->default('pending')->index();
            $table->timestamp('approved_at')->nullable();
            $table->string('status_reason')->nullable();
            $table->decimal('rating_avg', 3, 2)->default(0);
            $table->unsignedInteger('rating_count')->default(0);
            $table->timestamps();
        });

        Schema::create('farmer_market', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farmer_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('market_id')->constrained()->cascadeOnDelete();
            $table->string('stall_number', 20)->nullable();
            $table->unique(['farmer_profile_id', 'market_id']);
        });

        Schema::create('pickup_slots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farmer_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('market_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 0 = Sunday … 6 = Saturday
            $table->time('starts_at');
            $table->time('ends_at');
            $table->unsignedSmallInteger('capacity')->default(20);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['farmer_profile_id', 'day_of_week']);
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60);
            $table->string('slug', 80)->unique();
            $table->string('icon', 60)->nullable();
            $table->string('color', 20)->default('#C9E265');
            $table->string('description')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farmer_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('name', 100);
            $table->string('slug', 140)->unique();
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2);
            $table->string('unit', 20);
            $table->unsignedInteger('stock_quantity')->default(0);
            $table->unsignedInteger('weekly_quantity')->default(0);
            $table->string('image')->nullable();
            $table->string('status', 20)->default('available')->index();
            $table->boolean('is_featured')->default(false);
            $table->timestamp('removed_at')->nullable();
            $table->string('removed_reason')->nullable();
            $table->decimal('rating_avg', 3, 2)->default(0);
            $table->unsignedInteger('rating_count')->default(0);
            $table->unsignedInteger('sold_count')->default(0);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['category_id', 'status']);
            $table->index('price');
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('farmer_profile_id')->constrained()->cascadeOnDelete();
            $table->foreignId('market_id')->constrained()->restrictOnDelete();
            $table->foreignId('pickup_slot_id')->nullable()->constrained()->nullOnDelete();
            $table->date('pickup_date')->index();
            $table->time('pickup_starts_at');
            $table->time('pickup_ends_at');
            $table->dateTime('cutoff_at');
            $table->string('status', 20)->default('placed')->index();
            $table->decimal('total_amount', 10, 2);
            $table->unsignedInteger('items_count');
            $table->text('customer_note')->nullable();
            $table->text('farmer_note')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('ready_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamp('declined_at')->nullable();
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name', 100);
            $table->string('unit', 20);
            $table->decimal('unit_price', 10, 2);
            $table->unsignedInteger('quantity');
            $table->decimal('line_total', 10, 2);
        });

        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->morphs('reviewable');
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->text('farmer_reply')->nullable();
            $table->timestamp('replied_at')->nullable();
            $table->boolean('is_hidden')->default(false)->index();
            $table->string('hidden_reason')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'reviewable_type', 'reviewable_id', 'order_id'], 'reviews_unique_per_order');
        });

        Schema::create('favorites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->morphs('favoritable');
            $table->boolean('notify_restock')->default(true);
            $table->timestamps();
            $table->unique(['user_id', 'favoritable_type', 'favoritable_id']);
        });

        Schema::create('family_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('member_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 20)->default('pending');
            $table->timestamps();
            $table->unique(['owner_id', 'member_id']);
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 140);
            $table->text('body');
            $table->string('audience', 20)->default('all');
            $table->string('level', 20)->default('info');
            $table->boolean('is_published')->default(true);
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('generated_by')->constrained('users')->cascadeOnDelete();
            $table->string('report_type', 50);
            $table->json('filters')->nullable();
            $table->json('summary')->nullable();
            $table->timestamp('generated_at');
        });

        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('email', 100);
            $table->string('subject', 150);
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['contact_messages', 'reports', 'announcements', 'family_links', 'favorites', 'reviews', 'order_items', 'orders', 'products', 'categories', 'pickup_slots', 'farmer_market', 'farmer_profiles', 'markets'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
