<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SubtaskController extends Controller
{
    private function resolveTask($taskId)
    {
        return auth()->user()->tasks()->findOrFail($taskId);
    }

    public function index($taskId)
    {
        $task = $this->resolveTask($taskId);
        return response()->json($task->subtasks()->orderBy('created_at')->get());
    }

    public function store(Request $request, $taskId)
    {
        $task = $this->resolveTask($taskId);

        $request->validate([
            'title' => 'required|string|max:255',
        ]);

        $subtask = $task->subtasks()->create([
            'title' => $request->title,
            'completed' => false,
        ]);

        return response()->json($subtask, 201);
    }

    public function toggle($taskId, $subtaskId)
    {
        $task = $this->resolveTask($taskId);
        $subtask = $task->subtasks()->findOrFail($subtaskId);

        $subtask->completed = !$subtask->completed;
        $subtask->save();

        return response()->json($subtask);
    }

    public function destroy($taskId, $subtaskId)
    {
        $task = $this->resolveTask($taskId);
        $subtask = $task->subtasks()->findOrFail($subtaskId);

        $subtask->delete();

        return response()->json(['message' => 'Subtask deleted']);
    }
}
