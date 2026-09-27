<?php

namespace App\Payments;

final class CardDetails
{
    public static function digits(?string $number): string
    {
        return preg_replace('/\D+/', '', (string) $number);
    }

    public static function luhn(string $digits): bool
    {
        if (! preg_match('/^\d{12,19}$/', $digits)) {
            return false;
        }

        $sum = 0;
        $double = false;
        for ($i = strlen($digits) - 1; $i >= 0; $i--) {
            $d = (int) $digits[$i];
            if ($double) {
                $d *= 2;
                if ($d > 9) {
                    $d -= 9;
                }
            }
            $sum += $d;
            $double = ! $double;
        }

        return $sum % 10 === 0;
    }

    public static function brand(string $digits): string
    {
        return match (true) {
            (bool) preg_match('/^4/', $digits) => 'visa',
            (bool) preg_match('/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/', $digits) => 'mastercard',
            (bool) preg_match('/^3[47]/', $digits) => 'amex',
            (bool) preg_match('/^62/', $digits) => 'unionpay',
            default => 'card',
        };
    }

    public static function expired(int $month, int $year): bool
    {
        if ($year < 100) {
            $year += 2000;
        }

        return $month < 1 || $month > 12 || now()->startOfMonth()->greaterThan(now()->setDate($year, $month, 1)->startOfMonth());
    }

    public static function maskMsisdn(string $msisdn): string
    {
        return substr($msisdn, 0, 4).'•••'.substr($msisdn, -4);
    }
}
