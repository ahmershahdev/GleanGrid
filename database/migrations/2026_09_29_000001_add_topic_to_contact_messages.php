<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('contact_messages', 'topic')) {
            Schema::table('contact_messages', function (Blueprint $table) {
                $table->string('topic', 20)->default('other')->after('email')->index();
            });
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE contact_messages ADD CONSTRAINT chk_contact_topic CHECK (topic IN ('order','sell','partner','feedback','other'))");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE contact_messages DROP CONSTRAINT chk_contact_topic');
        }

        Schema::table('contact_messages', fn (Blueprint $table) => $table->dropColumn('topic'));
    }
};
