<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'category_id', 'title', 'description', 'completed', 'completed_at', 'due_date', 'priority'];

    protected $casts = [
        'completed_at' => 'datetime',
    ];

    // A task belongs to a user
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // A task belongs to a category
    public function category()
    {
        return $this->belongsTo(TaskCategory::class);
    }

    // A task has many subtasks
    public function subtasks()
    {
        return $this->hasMany(Subtask::class);
    }
}
