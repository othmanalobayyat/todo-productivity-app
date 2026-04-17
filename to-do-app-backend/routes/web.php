<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\TaskCategoryController;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/dashboard', function () {
    return view('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');


Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::get('/isadmin', function() {
        return Auth()->user()->isAdmin();
    });
    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/dashboard', [AdminController::class, 'dashboard'])->name('admin.dashboard');
        Route::get('/categories', [TaskCategoryController::class, 'index'])->name('admin.categories.index');
        Route::post('/categories', [TaskCategoryController::class, 'store'])->name('admin.categories.store');
        Route::put('/categories/{category}', [TaskCategoryController::class, 'update'])->name('admin.categories.update');
        Route::delete('/categories/{category}', [TaskCategoryController::class, 'destroy'])->name('admin.categories.destroy');

        Route::get('/users', [AdminController::class, 'users'])->name('admin.users.index');
    });
});

require __DIR__.'/auth.php';
