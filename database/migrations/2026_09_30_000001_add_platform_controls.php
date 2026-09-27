<?php

use App\Support\SchemaCompat;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function mysql(): bool
    {
        return in_array(DB::getDriverName(), ['mysql', 'mariadb'], true);
    }

    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dateTime('no_show_at')->nullable()->after('declined_at');
            $table->dateTime('reminder_sent_at')->nullable()->after('no_show_at');
            $table->index(['status', 'pickup_date', 'reminder_sent_at'], 'orders_reminder_due');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedSmallInteger('no_show_count')->default(0)->after('status');
            $table->dateTime('anonymized_at')->nullable()->after('last_login_at');
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 60);
            $table->string('subject_type', 40)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('description', 255);
            $table->json('meta')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->dateTime('created_at')->useCurrent();
            $table->index(['subject_type', 'subject_id']);
            $table->index(['action', 'created_at']);
            $table->index('created_at');
        });

        Schema::create('settings', function (Blueprint $table) {
            $table->string('key', 60)->primary();
            $table->text('value');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('order_status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20);
            $table->dateTime('changed_at')->useCurrent();
            $table->index(['order_id', 'changed_at']);
        });

        DB::table('settings')->insert(collect([
            'no_show_limit' => '3',
            'no_show_window_days' => '60',
            'reminder_hour' => '18',
            'customer_registration_open' => '1',
            'farmer_registration_open' => '1',
            'max_open_orders_per_customer' => '20',
        ])->map(fn ($value, $key) => ['key' => $key, 'value' => $value, 'created_at' => now(), 'updated_at' => now()])->values()->all());

        if (! $this->mysql()) {
            return;
        }

        SchemaCompat::dropCheck('orders', 'chk_order_status');
        DB::statement("ALTER TABLE orders ADD CONSTRAINT chk_order_status CHECK (status IN ('placed','accepted','ready','completed','declined','cancelled','no_show'))");
        DB::statement('ALTER TABLE users ADD CONSTRAINT chk_users_no_shows CHECK (no_show_count <= 1000)');
        DB::statement("ALTER TABLE settings ADD CONSTRAINT chk_settings_key CHECK (`key` REGEXP '^[a-z_]+$')");

        DB::statement('ALTER TABLE products ADD FULLTEXT INDEX products_fulltext (name, description)');

        DB::unprepared('DROP TRIGGER IF EXISTS trg_orders_status_insert');
        DB::unprepared('DROP TRIGGER IF EXISTS trg_orders_status_update');
        DB::unprepared('
            CREATE TRIGGER trg_orders_status_insert AFTER INSERT ON orders FOR EACH ROW
                INSERT INTO order_status_history (order_id, from_status, to_status, changed_at)
                VALUES (NEW.id, NULL, NEW.status, NOW())
        ');
        DB::unprepared('
            CREATE TRIGGER trg_orders_status_update AFTER UPDATE ON orders FOR EACH ROW
                INSERT INTO order_status_history (order_id, from_status, to_status, changed_at)
                SELECT NEW.id, OLD.status, NEW.status, NOW() FROM DUAL WHERE NOT (NEW.status <=> OLD.status)
        ');

        DB::statement("
            INSERT INTO order_status_history (order_id, from_status, to_status, changed_at)
            SELECT id, NULL, 'placed', created_at FROM orders
            UNION ALL SELECT id, 'placed', 'accepted', accepted_at FROM orders WHERE accepted_at IS NOT NULL
            UNION ALL SELECT id, 'accepted', 'ready', ready_at FROM orders WHERE ready_at IS NOT NULL
            UNION ALL SELECT id, 'ready', 'completed', completed_at FROM orders WHERE completed_at IS NOT NULL
            UNION ALL SELECT id, NULL, 'declined', declined_at FROM orders WHERE declined_at IS NOT NULL
            UNION ALL SELECT id, NULL, 'cancelled', cancelled_at FROM orders WHERE cancelled_at IS NOT NULL
        ");

        DB::unprepared('DROP PROCEDURE IF EXISTS sp_platform_summary');
        DB::unprepared("
            CREATE PROCEDURE sp_platform_summary(IN p_from DATE, IN p_to DATE)
            BEGIN
                SELECT
                    (SELECT COUNT(*) FROM farmer_profiles WHERE status = 'approved') AS farmers,
                    (SELECT COUNT(*) FROM users WHERE role = 'customer' AND anonymized_at IS NULL) AS customers,
                    (SELECT COUNT(*) FROM markets) AS markets,
                    COUNT(o.id) AS orders,
                    COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.total_amount END), 0) AS revenue,
                    SUM(o.status = 'no_show') AS no_shows,
                    SUM(o.status IN ('declined','cancelled')) AS lost
                FROM orders o
                WHERE o.pickup_date BETWEEN p_from AND p_to;
            END
        ");
    }

    public function down(): void
    {
        if ($this->mysql()) {
            DB::unprepared('DROP PROCEDURE IF EXISTS sp_platform_summary');
            DB::unprepared('DROP TRIGGER IF EXISTS trg_orders_status_insert');
            DB::unprepared('DROP TRIGGER IF EXISTS trg_orders_status_update');
            DB::statement('ALTER TABLE products DROP INDEX products_fulltext');
            SchemaCompat::dropCheck('users', 'chk_users_no_shows');
            SchemaCompat::dropCheck('orders', 'chk_order_status');
            DB::statement("ALTER TABLE orders ADD CONSTRAINT chk_order_status CHECK (status IN ('placed','accepted','ready','completed','declined','cancelled'))");
        }
        Schema::dropIfExists('order_status_history');
        Schema::dropIfExists('settings');
        Schema::dropIfExists('audit_logs');
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['no_show_count', 'anonymized_at']));
        Schema::table('orders', function (Blueprint $t) {
            $t->dropIndex('orders_reminder_due');
            $t->dropColumn(['no_show_at', 'reminder_sent_at']);
        });
    }
};
