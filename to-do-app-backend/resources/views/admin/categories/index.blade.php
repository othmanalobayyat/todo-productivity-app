@extends('layouts.app')

@section('content')
<div class="container">
    <h1>Task Categories</h1>
    <form action="{{ route('admin.categories.store') }}" method="POST">
        @csrf
        <input type="text" name="name" placeholder="New Category" class="border p-2 rounded">
        <button type="submit" class="bg-blue-500 text-white p-2 rounded">Add</button>
    </form>

    <ul class="mt-4">
        @foreach($categories as $category)
        <li class="flex justify-between items-center">
            <form action="{{ route('admin.categories.update', $category) }}" method="POST" class="inline">
                @csrf
                @method('PUT')
                <input type="text" name="name" value="{{ $category->name }}" class="border p-2 rounded">
                <button type="submit" class="bg-green-500 text-white p-2 rounded">Update</button>
            </form>
            <form action="{{ route('admin.categories.destroy', $category) }}" method="POST" class="inline">
                @csrf
                @method('DELETE')
                <button type="submit" class="bg-red-500 text-white p-2 rounded">Delete</button>
            </form>
        </li>
        @endforeach
    </ul>
</div>
@endsection
