<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ImageUpload
{
    public const RULES = ['file', 'mimetypes:image/webp,image/jpeg,image/png,image/gif', 'max:4096', 'dimensions:min_width=64,min_height=64,max_width=6000,max_height=6000'];

    private const MAX_PIXELS = 24_000_000;

    public static function store(UploadedFile $file, string $dir, string $field = 'image', int $maxSide = 1600, int $quality = 82): string
    {
        [$width, $height] = @getimagesize($file->getRealPath()) ?: [0, 0];
        if ($width * $height === 0 || $width * $height > self::MAX_PIXELS) {
            throw ValidationException::withMessages([$field => 'validation.image']);
        }

        $name = $dir.'/'.Str::uuid().'.webp';

        if (! function_exists('imagewebp')) {
            $ext = $file->getMimeType() === 'image/webp' ? 'webp' : ($file->guessExtension() ?: 'img');
            $name = $dir.'/'.Str::uuid().'.'.$ext;
            Storage::disk('public')->putFileAs($dir, $file, basename($name));

            return $name;
        }

        $src = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));
        if (! $src) {
            throw ValidationException::withMessages([$field => 'validation.image']);
        }

        $scale = min(1, $maxSide / max($width, $height));
        $w = max(1, (int) round($width * $scale));
        $h = max(1, (int) round($height * $scale));

        $out = imagecreatetruecolor($w, $h);
        imagealphablending($out, false);
        imagesavealpha($out, true);
        imagecopyresampled($out, $src, 0, 0, 0, 0, $w, $h, $width, $height);

        ob_start();
        imagewebp($out, null, $quality);
        $bytes = (string) ob_get_clean();
        imagedestroy($src);
        imagedestroy($out);

        Storage::disk('public')->put($name, $bytes);

        return $name;
    }

    public static function delete(?string $path): void
    {
        if ($path && ! str_starts_with($path, 'produce:') && ! str_starts_with($path, 'http')) {
            Storage::disk('public')->delete($path);
        }
    }
}
