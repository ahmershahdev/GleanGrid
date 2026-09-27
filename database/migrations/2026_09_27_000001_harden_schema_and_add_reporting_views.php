<?php

use App\Support\SchemaCompat;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const CHECKS = [
        'users' => [
            'chk_users_role' => "role IN ('customer','farmer','admin')",
            'chk_users_status' => "status IN ('active','inactive')",
        ],
        'farmer_profiles' => [
            'chk_farmer_status' => "status IN ('pending','approved','suspended')",
            'chk_farmer_rating' => 'rating_avg BETWEEN 0 AND 5',
            'chk_farmer_cutoff' => 'order_cutoff_hours BETWEEN 1 AND 168',
        ],
        'markets' => [
            'chk_market_hours' => 'closes_at > opens_at',
            'chk_market_lat' => 'latitude BETWEEN -90 AND 90',
            'chk_market_lng' => 'longitude BETWEEN -180 AND 180',
        ],
        'pickup_slots' => [
            'chk_slot_day' => 'day_of_week BETWEEN 0 AND 6',
            'chk_slot_window' => 'ends_at > starts_at',
            'chk_slot_capacity' => 'capacity > 0',
        ],
        'products' => [
            'chk_product_price' => 'price >= 0',
            'chk_product_status' => "status IN ('available','sold_out','unavailable')",
            'chk_product_rating' => 'rating_avg BETWEEN 0 AND 5',
        ],
        'orders' => [
            'chk_order_status' => "status IN ('placed','accepted','ready','completed','declined','cancelled')",
            'chk_order_total' => 'total_amount >= 0',
            'chk_order_window' => 'pickup_ends_at > pickup_starts_at',
        ],
        'order_items' => [
            'chk_item_qty' => 'quantity > 0',
            'chk_item_price' => 'unit_price >= 0',
        ],
        'reviews' => [
            'chk_review_rating' => 'rating BETWEEN 1 AND 5',
        ],
        'family_links' => [
            'chk_family_status' => "status IN ('pending','accepted')",
            'chk_family_self' => 'owner_id <> member_id',
        ],
    ];

    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->index(['customer_id', 'status', 'pickup_date'], 'orders_customer_status_date');
            $table->index(['farmer_profile_id', 'status', 'pickup_date'], 'orders_farmer_status_date');
            $table->index(['pickup_slot_id', 'pickup_date', 'status'], 'orders_slot_capacity');
            $table->index(['market_id', 'status'], 'orders_market_status');
            $table->index('created_at');
            $table->index('completed_at');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->index(['farmer_profile_id', 'status', 'removed_at'], 'products_farmer_listing');
            $table->index(['is_featured', 'status'], 'products_featured');
            $table->index('sold_count');
            $table->index('rating_avg');
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->index(['reviewable_type', 'reviewable_id', 'is_hidden'], 'reviews_visible_for');
        });

        Schema::table('farmer_profiles', function (Blueprint $table) {
            $table->index('rating_avg');
        });

        Schema::table('announcements', function (Blueprint $table) {
            $table->index(['is_published', 'audience', 'expires_at'], 'announcements_visible');
        });

        Schema::table('contact_messages', function (Blueprint $table) {
            $table->index(['is_read', 'created_at']);
            $table->string('ip_address', 45)->nullable()->after('message');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('password_changed_at')->nullable()->after('password');
        });

        Schema::table('reports', function (Blueprint $table) {
            $table->dateTime('generated_at')->change();
        });

        Schema::create('verification_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('purpose', 30);
            $table->string('code_hash');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->dateTime('expires_at');
            $table->dateTime('consumed_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'purpose', 'consumed_at']);
        });

        Schema::create('login_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('login', 100);
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->char('device_hash', 64)->nullable();
            $table->boolean('successful');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'device_hash']);
            $table->index(['ip_address', 'created_at']);
        });

        if ($this->supportsChecks()) {
            foreach (self::CHECKS as $table => $checks) {
                foreach ($checks as $name => $expr) {
                    DB::statement("ALTER TABLE `{$table}` ADD CONSTRAINT `{$name}` CHECK ({$expr})");
                }
            }
        }

        $this->createViews();
    }

    public function down(): void
    {
        foreach (['v_market_revenue', 'v_farmer_performance', 'v_product_catalog', 'v_daily_orders'] as $view) {
            DB::statement("DROP VIEW IF EXISTS {$view}");
        }

        if ($this->supportsChecks()) {
            foreach (self::CHECKS as $table => $checks) {
                foreach (array_keys($checks) as $name) {
                    SchemaCompat::dropCheck($table, $name);
                }
            }
        }

        Schema::dropIfExists('login_events');
        Schema::dropIfExists('verification_codes');
        Schema::table('reports', fn (Blueprint $t) => $t->timestamp('generated_at')->change());

        $this->dropColumns('users', ['password_changed_at']);
        $this->dropColumns('contact_messages', ['ip_address']);
        $this->dropIndexes('contact_messages', ['contact_messages_is_read_created_at_index']);
        $this->dropIndexes('announcements', ['announcements_visible']);
        $this->dropIndexes('farmer_profiles', ['farmer_profiles_rating_avg_index']);
        $this->dropIndexes('reviews', ['reviews_visible_for']);
        $this->ensureFkIndexes('products', ['farmer_profile_id']);
        $this->dropIndexes('products', ['products_farmer_listing', 'products_featured', 'products_sold_count_index', 'products_rating_avg_index']);

        $this->ensureFkIndexes('orders', ['customer_id', 'farmer_profile_id', 'pickup_slot_id', 'market_id']);
        $this->dropIndexes('orders', ['orders_customer_status_date', 'orders_farmer_status_date', 'orders_slot_capacity', 'orders_market_status', 'orders_created_at_index', 'orders_completed_at_index']);
    }

    private function ensureFkIndexes(string $table, array $columns): void
    {
        foreach ($columns as $column) {
            if (! Schema::hasIndex($table, "{$table}_{$column}_foreign") && ! Schema::hasIndex($table, "{$table}_{$column}_index")) {
                Schema::table($table, fn (Blueprint $t) => $t->index($column));
            }
        }
    }

    private function dropColumns(string $table, array $columns): void
    {
        foreach ($columns as $column) {
            if (Schema::hasColumn($table, $column)) {
                Schema::table($table, fn (Blueprint $t) => $t->dropColumn($column));
            }
        }
    }

    private function dropIndexes(string $table, array $indexes): void
    {
        foreach ($indexes as $index) {
            if (Schema::hasIndex($table, $index)) {
                Schema::table($table, fn (Blueprint $t) => $t->dropIndex($index));
            }
        }
    }

    private function supportsChecks(): bool
    {
        return in_array(DB::getDriverName(), ['mysql', 'mariadb', 'pgsql'], true);
    }

    private function createViews(): void
    {
        DB::statement(<<<'SQL'
            CREATE OR REPLACE VIEW v_market_revenue AS
            SELECT m.id AS market_id, m.name AS market_name, m.city,
                   COUNT(o.id) AS orders_total,
                   SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS orders_completed,
                   SUM(CASE WHEN o.status IN ('placed','accepted','ready') THEN 1 ELSE 0 END) AS orders_open,
                   COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount END), 0) AS revenue
            FROM markets m
            LEFT JOIN orders o ON o.market_id = m.id
            GROUP BY m.id, m.name, m.city
        SQL);

        DB::statement(<<<'SQL'
            CREATE OR REPLACE VIEW v_farmer_performance AS
            SELECT f.id AS farmer_profile_id, f.stall_name, f.status, u.email, f.rating_avg, f.rating_count,
                   COUNT(o.id) AS orders_total,
                   SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS orders_completed,
                   SUM(CASE WHEN o.status IN ('declined','cancelled') THEN 1 ELSE 0 END) AS orders_lost,
                   COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount END), 0) AS revenue,
                   (SELECT COUNT(*) FROM products p WHERE p.farmer_profile_id = f.id AND p.deleted_at IS NULL AND p.removed_at IS NULL) AS listings
            FROM farmer_profiles f
            JOIN users u ON u.id = f.user_id
            LEFT JOIN orders o ON o.farmer_profile_id = f.id
            GROUP BY f.id, f.stall_name, f.status, u.email, f.rating_avg, f.rating_count
        SQL);

        DB::statement(<<<'SQL'
            CREATE OR REPLACE VIEW v_product_catalog AS
            SELECT p.id AS product_id, p.name, p.slug, p.price, p.unit, p.stock_quantity, p.status,
                   c.name AS category, f.id AS farmer_profile_id, f.stall_name, p.rating_avg, p.sold_count
            FROM products p
            JOIN categories c ON c.id = p.category_id
            JOIN farmer_profiles f ON f.id = p.farmer_profile_id
            JOIN users u ON u.id = f.user_id
            WHERE p.deleted_at IS NULL AND p.removed_at IS NULL
              AND f.status = 'approved' AND u.status = 'active'
        SQL);

        DB::statement(<<<'SQL'
            CREATE OR REPLACE VIEW v_daily_orders AS
            SELECT DATE(o.created_at) AS day, COUNT(*) AS orders,
                   SUM(CASE WHEN o.status = 'completed' THEN o.total_amount ELSE 0 END) AS revenue
            FROM orders o
            GROUP BY DATE(o.created_at)
        SQL);
    }
};
