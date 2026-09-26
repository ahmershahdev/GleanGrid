<?php

return [

    /*
    | Argon2id is OWASP's first recommendation for password storage: memory-hard,
    | so GPU cracking rigs gain far less than against bcrypt. Existing bcrypt
    | hashes still verify (verify => false only skips the algorithm assertion)
    | and are transparently upgraded to Argon2id on the user's next sign-in.
    */

    'driver' => env('HASH_DRIVER', 'argon2id'),

    'bcrypt' => [
        'rounds' => env('BCRYPT_ROUNDS', 12),
        'verify' => env('HASH_VERIFY', true),
        'limit' => env('BCRYPT_LIMIT', null),
    ],

    'argon' => [
        'memory' => (int) env('ARGON_MEMORY', 65536), // 64 MiB
        'threads' => (int) env('ARGON_THREADS', 1),
        'time' => (int) env('ARGON_TIME', 4),
        'verify' => env('HASH_VERIFY', false),
    ],

    'rehash_on_login' => true,

];
