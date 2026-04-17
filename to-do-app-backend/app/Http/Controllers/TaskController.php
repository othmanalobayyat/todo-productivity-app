<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Task;

class TaskController extends Controller
{
    public function index()
    {
        $tasks = Task::with('category')->where('user_id', auth()->id())->get();
        return response()->json($tasks);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|max:255',
            'description' => 'nullable',
            'category_id' => 'nullable|exists:task_categories,id',
            'due_date' => 'nullable|date',
            'priority' => 'nullable|in:high,medium,low',
        ]);

        $task = Task::create([
            'user_id' => auth()->id(),
            'title' => $request->title,
            'description' => $request->description,
            'category_id' => $request->category_id,
            'due_date' => $request->due_date,
            'completed' => false,
            'priority' => $request->priority ?? 'medium',
        ]);

        return response()->json($task, 201);
    }

    public function show($id)
    {
        $task = auth()->user()->tasks()->with('category')->find($id);

        if (!$task) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        return response()->json($task);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'nullable|exists:task_categories,id',
            'due_date' => 'nullable|date',
            'completed' => 'required|boolean',
            'priority' => 'nullable|in:high,medium,low',
        ]);

        $task = auth()->user()->tasks()->find($id);

        if (!$task) {
            return response()->json(['message' => 'Task not found'], 404);
        }

        $task->update([
            'title' => $request->title,
            'description' => $request->description,
            'category_id' => $request->category_id,
            'due_date' => $request->due_date,
            'completed' => $request->completed,
            'priority' => $request->priority ?? $task->priority,
        ]);

        return response()->json($task);
    }


    public function destroy($id)
    {
        $task = auth()->user()->tasks()->find($id);

        if (!$task)
        {
            return response()->json(['message' => 'Task not found'], 404);
        }

        $task->delete();

        return response()->json(['message' => 'Task deleted successfully']);
    }

    public function markAsComplete($id)
    {
        $task = auth()->user()->tasks()->find($id);

        if (!$task)
        {
            return response()->json(['error' => 'Task not found'], 404);
        }

        $task->completed = true;
        $task->save();

        return response()->json(['message' => 'Task marked as completed', 'task' => $task]);
    }
}