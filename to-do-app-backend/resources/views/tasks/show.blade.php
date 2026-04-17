@extends('layouts.app')

@section('content')
<div class="container">
    <h1>Task Details</h1>
    <div class="mb-3">
        <strong>Title:</strong> {{ $task->title }}
    </div>
    <div class="mb-3">
        <strong>Description:</strong> {{ $task->description ?? 'No description provided' }}
    </div>
    <div class="mb-3">
        <strong>Category:</strong> {{ $task->category->name ?? 'Uncategorized' }}
    </div>
    <div class="mb-3">
        <strong>Due Date:</strong> {{ $task->due_date ?? 'No due date set' }}
    </div>
    <div class="mb-3">
        <strong>Completed:</strong> {{ $task->completed ? 'Yes' : 'No' }}
    </div>
    <a href="{{ route('tasks.index') }}" class="btn btn-secondary">Back to Tasks</a>
</div>
@endsection
