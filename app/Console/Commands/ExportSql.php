<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class ExportSql extends Command
{
    protected $signature = 'gleangrid:export-sql {--mysqldump= : Path to mysqldump (defaults to PATH, then XAMPP)}';

    protected $description = 'Write database/sql/01_schema.sql and 02_seed_data.sql from the current database';

    private const SCHEMA_HEADER = <<<'SQL'
        -- GleanGrid (MarketLink) — database structure
        -- Tables, primary/foreign keys, unique + composite indexes, CHECK constraints, FULLTEXT search index,
        -- reporting views, the trg_orders_status_* triggers and the sp_platform_summary stored procedure.
        -- MySQL 8 / MariaDB 10.4+. Import this first, then 02_seed_data.sql.
        -- Generated from the Laravel migrations (the source of truth): php artisan gleangrid:export-sql

        SQL;

    private const SEED_HEADER = <<<'SQL'
        -- GleanGrid (MarketLink) — demo data (Hyderabad, Sindh)
        -- Demo sign-ins: admin@gleangrid.test / Admin@123 · farmer@gleangrid.test / Farmer@123 · customer@gleangrid.test / Customer@123
        -- Passwords are Argon2id hashes. Equivalent to: php artisan db:seed

        SQL;

    private const SKIP_DATA = ['sessions', 'cache', 'cache_locks', 'jobs', 'job_batches', 'failed_jobs', 'login_events', 'password_reset_tokens', 'verification_codes', 'order_status_history'];

    private const HISTORY_REBUILD = <<<'SQL'

        -- Order status history: rebuilt from the orders' timestamps (the triggers keep it current from here on).
        DELETE FROM `order_status_history`;
        INSERT INTO `order_status_history` (`order_id`, `from_status`, `to_status`, `changed_at`)
        SELECT id, NULL, 'placed', created_at FROM orders
        UNION ALL SELECT id, 'placed', 'accepted', accepted_at FROM orders WHERE accepted_at IS NOT NULL
        UNION ALL SELECT id, 'accepted', 'ready', ready_at FROM orders WHERE ready_at IS NOT NULL
        UNION ALL SELECT id, 'ready', 'completed', completed_at FROM orders WHERE completed_at IS NOT NULL
        UNION ALL SELECT id, 'ready', 'no_show', no_show_at FROM orders WHERE no_show_at IS NOT NULL
        UNION ALL SELECT id, NULL, 'declined', declined_at FROM orders WHERE declined_at IS NOT NULL
        UNION ALL SELECT id, NULL, 'cancelled', cancelled_at FROM orders WHERE cancelled_at IS NOT NULL;

        SQL;

    public function handle(): int
    {
        $db = config('database.connections.'.config('database.default'));
        if (($db['driver'] ?? null) !== 'mysql' && ($db['driver'] ?? null) !== 'mariadb') {
            $this->error('Export needs a MySQL/MariaDB connection.');

            return self::FAILURE;
        }

        $bin = $this->option('mysqldump') ?: $this->findMysqldump();
        $base = [$bin, '--host='.$db['host'], '--port='.$db['port'], '--user='.$db['username'], '--default-character-set=utf8mb4', '--skip-dump-date', '--skip-comments'];
        $env = filled($db['password']) ? ['MYSQL_PWD' => $db['password']] : [];

        $schema = $this->dump([...$base, '--no-data', '--routines', '--triggers', $db['database']], $env);
        $data = $this->dump([...$base, '--no-create-info', '--skip-triggers', '--complete-insert', '--extended-insert', ...array_map(fn ($t) => "--ignore-table={$db['database']}.{$t}", self::SKIP_DATA), $db['database']], $env);

        if ($schema === null || $data === null) {
            return self::FAILURE;
        }

        $dir = database_path('sql');
        file_put_contents("{$dir}/01_schema.sql", self::SCHEMA_HEADER.$this->portable($schema));
        file_put_contents("{$dir}/02_seed_data.sql", self::SEED_HEADER.$this->portable($data).self::HISTORY_REBUILD);

        $this->info('Wrote database/sql/01_schema.sql ('.number_format(filesize("{$dir}/01_schema.sql")).' bytes) and 02_seed_data.sql ('.number_format(filesize("{$dir}/02_seed_data.sql")).' bytes).');

        return self::SUCCESS;
    }

    private function dump(array $command, array $env): ?string
    {
        $process = new Process($command, null, $env, null, 120);
        $process->run();
        if (! $process->isSuccessful()) {
            $this->error(trim($process->getErrorOutput()) ?: 'mysqldump failed.');

            return null;
        }

        return $process->getOutput();
    }

    private function portable(string $sql): string
    {
        $sql = preg_replace('/\sDEFINER=`[^`]+`@`[^`]+`/', '', $sql);
        $sql = preg_replace('#/\*!50013 SQL SECURITY DEFINER \*/\n?#', '', $sql);
        $sql = preg_replace('/ AUTO_INCREMENT=\d+/', '', $sql);

        return str_replace("\r\n", "\n", $sql);
    }

    private function findMysqldump(): string
    {
        foreach (['C:\\xampp\\mysql\\bin\\mysqldump.exe', '/opt/lampp/bin/mysqldump', '/Applications/XAMPP/bin/mysqldump'] as $candidate) {
            if (is_file($candidate)) {
                return $candidate;
            }
        }

        return 'mysqldump';
    }
}
