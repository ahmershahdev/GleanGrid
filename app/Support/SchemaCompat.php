<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

class SchemaCompat
{
    public static function dropCheck(string $table, string $name): void
    {
        $exists = DB::table('information_schema.TABLE_CONSTRAINTS')
            ->where('CONSTRAINT_SCHEMA', DB::getDatabaseName())
            ->where('TABLE_NAME', $table)
            ->where('CONSTRAINT_NAME', $name)
            ->where('CONSTRAINT_TYPE', 'CHECK')
            ->exists();

        if ($exists) {
            DB::statement("ALTER TABLE `{$table}` DROP CONSTRAINT `{$name}`");
        }
    }
}
