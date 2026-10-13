<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ContractController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\ReleaseController;
use App\Http\Controllers\Api\ReferenceDataController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\WilayahController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json(['name' => 'Dimensi Suara Laravel API', 'status' => 'ok']));

// These JSON routes use Laravel's web middleware for a server-side, HttpOnly session.
// The Vue client obtains a CSRF token before each state-changing request.
Route::prefix('api')->group(function (): void {
    Route::get('/health', fn () => response()->json(['success' => true, 'service' => 'laravel']));
    Route::get('/csrf', [AuthController::class, 'csrf']);
    Route::get('/auth/session', [AuthController::class, 'session']);
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::match(['get', 'post'], '/auth/check-duplicate', [AuthController::class, 'checkDuplicate'])->middleware('throttle:30,1');
    Route::post('/users/upload-doc', [DocumentController::class, 'uploadRegistrationDocument'])->middleware('throttle:30,1');
    Route::get('/wilayah/provinces', [WilayahController::class, 'provinces'])->middleware('throttle:60,1');
    Route::get('/wilayah/regencies/{code}', [WilayahController::class, 'regencies'])->middleware('throttle:60,1');
    Route::get('/wilayah/districts/{code}', [WilayahController::class, 'districts'])->middleware('throttle:60,1');
    Route::get('/wilayah/villages/{code}', [WilayahController::class, 'villages'])->middleware('throttle:60,1');
    Route::get('/wilayah/postal-code', [WilayahController::class, 'postalCode'])->middleware('throttle:30,1');
    Route::get('/contracts/sign/{token}', [ContractController::class, 'signing'])->middleware('throttle:30,1');
    Route::get('/contracts/sign/{token}/document', [ContractController::class, 'signingDocument'])->middleware('throttle:30,1');
    Route::post('/contracts/sign/{token}', [ContractController::class, 'sign'])->middleware('throttle:10,1');

    Route::middleware('cms.auth')->group(function (): void {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{id}', [UserController::class, 'show'])->whereNumber('id');
        Route::patch('/users/{id}', [UserController::class, 'update'])->whereNumber('id')->middleware('throttle:20,1');
        Route::post('/admins', [UserController::class, 'createStaff'])->middleware('throttle:10,1');
        Route::patch('/admins/{id}/password', [UserController::class, 'resetStaffPassword'])->whereNumber('id')->middleware('throttle:10,1');
        Route::get('/users/{id}/documents/{field}', [DocumentController::class, 'show'])->whereNumber('id');
        Route::get('/contracts', [ContractController::class, 'index']);
        Route::get('/reports', [ReportController::class, 'index']);
        Route::post('/reports/import', [ReportController::class, 'upload'])->middleware('throttle:5,1');
        Route::get('/reports/{id}', [ReportController::class, 'show'])->whereNumber('id');
        Route::put('/reports/{id}/rates', [ReportController::class, 'rates'])->whereNumber('id');
        Route::post('/reports/{id}/recheck', [ReportController::class, 'recheck'])->whereNumber('id');
        Route::post('/reports/{id}/finalize', [ReportController::class, 'finalize'])->whereNumber('id');
        Route::post('/users/{id}/contracts/generate', [ContractController::class, 'generate'])->whereNumber('id')->middleware('throttle:10,1');
        Route::post('/contracts/{id}/send', [ContractController::class, 'send'])->whereNumber('id')->middleware('throttle:10,1');
        Route::get('/contracts/{id}/document', [ContractController::class, 'document'])->whereNumber('id');
        Route::get('/reference/release-form', [ReferenceDataController::class, 'releaseForm']);
        Route::get('/releases', [ReleaseController::class, 'index']);
        Route::post('/releases', [ReleaseController::class, 'store'])->middleware('throttle:10,1');
        Route::post('/releases/uploads', [ReleaseController::class, 'upload'])->middleware('throttle:30,1');
        Route::get('/releases/{id}', [ReleaseController::class, 'show'])->whereNumber('id');
        Route::put('/releases/{id}', [ReleaseController::class, 'update'])->whereNumber('id')->middleware('throttle:20,1');
        Route::post('/releases/{id}/submit', [ReleaseController::class, 'submit'])->whereNumber('id')->middleware('throttle:10,1');
        Route::patch('/releases/{id}/review', [ReleaseController::class, 'review'])->whereNumber('id')->middleware('throttle:20,1');
        Route::get('/releases/{id}/cover', [ReleaseController::class, 'cover'])->whereNumber('id');
        Route::get('/releases/{id}/tracks/{trackId}/media/{kind}', [ReleaseController::class, 'trackMedia'])->whereNumber('id')->whereNumber('trackId');
    });
});
