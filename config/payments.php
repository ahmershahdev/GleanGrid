<?php

return [

    'mode' => env('PAYMENTS_MODE', 'sandbox'),

    'currency' => 'PKR',

    'max_attempts' => 5,

    'wallet_approval_seconds' => (int) env('PAYMENTS_WALLET_APPROVAL_SECONDS', 4),

    'processing_timeout_minutes' => 10,

    'jazzcash' => [
        'merchant_id' => env('JAZZCASH_MERCHANT_ID'),
        'password' => env('JAZZCASH_PASSWORD'),
        'integrity_salt' => env('JAZZCASH_INTEGRITY_SALT'),
        'endpoint' => env('JAZZCASH_ENDPOINT', 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/'),
    ],

];
