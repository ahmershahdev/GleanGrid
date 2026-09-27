<?php

namespace App\Payments;

final class GatewayResult
{
    public const SUCCEEDED = 'succeeded';

    public const FAILED = 'failed';

    public const PENDING = 'pending';

    public const REDIRECT = 'redirect';

    private function __construct(
        public readonly string $status,
        public readonly ?string $providerRef = null,
        public readonly ?string $message = null,
        public readonly array $details = [],
        public readonly ?array $redirect = null,
    ) {}

    public static function succeeded(string $providerRef, array $details = []): self
    {
        return new self(self::SUCCEEDED, $providerRef, null, $details);
    }

    public static function failed(string $message, array $details = []): self
    {
        return new self(self::FAILED, null, $message, $details);
    }

    public static function pending(array $details = [], ?string $providerRef = null): self
    {
        return new self(self::PENDING, $providerRef, null, $details);
    }

    public static function redirect(string $url, array $fields, string $providerRef): self
    {
        return new self(self::REDIRECT, $providerRef, null, [], ['url' => $url, 'fields' => $fields]);
    }
}
