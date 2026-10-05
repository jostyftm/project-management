<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'sdi' => [
        'auth' => [
            'url' => env('SDI_AUTH_SERVICE_URL', 'http://sdi_auth-service'),
            'application_id' => (int) env('SDI_AUTH_APPLICATION_ID', 9),
            'users_endpoint' => env('SDI_AUTH_USERS_ENDPOINT', '/api/v1/applications/{application_id}/users'),
            'bypass' => (bool) env('AUTH_BYPASS', false),
        ],
    ],

    'sdi_auth_service' => [
        'base_url' => env('SDI_AUTH_SERVICE_URL', 'http://sdi_auth-service'),
        'application_id' => (int) env('SDI_AUTH_APPLICATION_ID', 9),
        'users_endpoint' => env('SDI_AUTH_USERS_ENDPOINT', '/api/v1/applications/{application_id}/users'),
    ],

    'browsershot' => [
        'chrome_path' => env('CHROME_PATH', '/usr/bin/chromium'),
        'node_path'   => env('NODE_PATH', '/usr/bin/node'),
        'npm_path'    => env('NPM_PATH', '/usr/lib/node_modules'),
    ],

];
