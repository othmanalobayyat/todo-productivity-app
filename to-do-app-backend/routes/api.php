<?php

use Illuminate\Http\Request;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\SubtaskController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use App\Models\TaskCategory;

Route::get('/ping', function ()
    {
        return response()->json(['message' => 'pong'], 200);
    }
);
Route::post('/register', [UserController::class, 'register']);  // Register user
Route::post('/login', [UserController::class, 'token']); // Login user

Route::middleware('auth:sanctum')->group(function ()
{
    Route::get('/tasks', [TaskController::class, 'index']); // Get all tasks
    Route::post('/tasks', [TaskController::class, 'store']); // Create new task
    Route::get('/tasks/{task}', [TaskController::class, 'show']); // View task details
    Route::put('/tasks/{task}', [TaskController::class, 'update']); // Update task
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']); // Delete task
    Route::patch('/tasks/{task}/complete', [TaskController::class, 'markAsComplete']);
    Route::get('/tasks/{task}/subtasks', [SubtaskController::class, 'index']);
    Route::post('/tasks/{task}/subtasks', [SubtaskController::class, 'store']);
    Route::patch('/tasks/{task}/subtasks/{subtask}/toggle', [SubtaskController::class, 'toggle']);
    Route::delete('/tasks/{task}/subtasks/{subtask}', [SubtaskController::class, 'destroy']);
    Route::get('/task-categories', function () {return response()->json(TaskCategory::all());});
    Route::get('/profile', [UserController::class, 'profile']);
    Route::post('/logout', [UserController::class, 'logout']);
});


Route::get('/user', function (Request $request)
{
    return $request->user();
})->middleware('auth:sanctum');