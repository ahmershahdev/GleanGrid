<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The admin inbox now holds messages from the contact form *and* e-mails
 * received through Resend, and records the admin's e-mailed reply.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->string('source', 10)->default('form')->after('message'); // form | email
            $table->string('external_id', 100)->nullable()->unique()->after('source'); // Resend email id (idempotent webhooks)
            $table->text('reply_body')->nullable()->after('is_read');
            $table->dateTime('replied_at')->nullable()->after('reply_body');
            $table->foreignId('replied_by')->nullable()->after('replied_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('contact_messages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('replied_by');
            $table->dropUnique(['external_id']);
            $table->dropColumn(['source', 'external_id', 'reply_body', 'replied_at']);
        });
    }
};
