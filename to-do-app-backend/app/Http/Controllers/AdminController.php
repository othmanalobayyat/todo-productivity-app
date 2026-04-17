<?php
namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Task;
use App\Models\TaskCategory;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function dashboard()
    {
        $totalTasks = Task::count();
        $totalCategories = TaskCategory::count();
        $totalUsers = User::count();

        return view('admin.dashboard', compact('totalTasks', 'totalCategories', 'totalUsers'));
    }

    public function users()
    {
        $users = User::withCount(['tasks', 'tasks as completed_tasks_count' => function ($query) {
            $query->where('completed', true);
        }])->get();

        return view('admin.users.index', compact('users'));
    }
}
