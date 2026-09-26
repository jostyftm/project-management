<?php

use Dedoc\Scramble\Scramble;
use Illuminate\Support\Facades\Route;

Scramble::registerUiRoute(path: '/api/v1/docs', api: 'default');
Scramble::registerUiRoute(path: '/api/v2/docs', api: 'v2');

Route::get('/', function () {
    return view('welcome');
});
