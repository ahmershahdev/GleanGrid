<?php

namespace App\Console\Commands;

use App\Support\LlmsText;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\URL;

class GenerateLlmsFiles extends Command
{
    protected $signature = 'gleangrid:llms
        {--url= : Public base URL to use in links (defaults to APP_URL)}
        {--write : Also write static copies to public/ (for hosts that serve files without PHP)}';

    protected $description = 'Rebuild /llms.txt and /llms-full.txt from live data';

    public function handle(): int
    {
        $base = rtrim($this->option('url') ?: config('app.url'), '/');
        URL::forceRootUrl($base);
        URL::forceScheme(parse_url($base, PHP_URL_SCHEME) ?: 'https');

        LlmsText::forget();
        ['summary' => $summary, 'full' => $full] = LlmsText::cached();

        if ($this->option('write')) {
            file_put_contents(public_path('llms.txt'), $summary);
            file_put_contents(public_path('llms-full.txt'), $full);
            $this->info('Wrote public/llms.txt and public/llms-full.txt for '.$base.'.');
        } else {
            $this->info('Rebuilt /llms.txt ('.strlen($summary).' bytes) and /llms-full.txt ('.strlen($full).' bytes) for '.$base.'.');
        }

        return self::SUCCESS;
    }
}
