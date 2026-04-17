@extends('layouts.app')

@section('content')
<div class="container">
    <h1>Admin Dashboard</h1>
    <div class="grid grid-cols-3 gap-4">
        <div class="bg-blue-100 p-4 rounded shadow">
            <h2>Total Tasks</h2>
            <p>{{ $totalTasks }}</p>
        </div>
        <div class="bg-green-100 p-4 rounded shadow">
            <h2>Total Categories</h2>
            <p>{{ $totalCategories }}</p>
        </div>
        <div class="bg-yellow-100 p-4 rounded shadow">
            <h2>Total Users</h2>
            <p>{{ $totalUsers }}</p>
        </div>
    </div>
</div>
@endsection
