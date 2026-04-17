@extends('layouts.app')

@section('content')
<div class="container">
    <h1>User Records</h1>
    <table class="table-auto w-full border-collapse border border-gray-400">
        <thead>
            <tr>
                <th class="border border-gray-300 px-4 py-2">Name</th>
                <th class="border border-gray-300 px-4 py-2">Email</th>
                <th class="border border-gray-300 px-4 py-2">Total Tasks</th>
                <th class="border border-gray-300 px-4 py-2">Completed Tasks</th>
            </tr>
        </thead>
        <tbody>
            @foreach($users as $user)
            <tr>
                <td class="border border-gray-300 px-4 py-2">{{ $user->name }}</td>
                <td class="border border-gray-300 px-4 py-2">{{ $user->email }}</td>
                <td class="border border-gray-300 px-4 py-2">{{ $user->tasks_count }}</td>
                <td class="border border-gray-300 px-4 py-2">{{ $user->completed_tasks_count }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endsection
