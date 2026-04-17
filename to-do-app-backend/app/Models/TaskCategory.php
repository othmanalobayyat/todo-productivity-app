<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskCategory extends Model
{
    use HasFactory;

    protected $fillable = ['name'];

    // A category has many tasks
    public function tasks()
    {
        return $this->hasMany(Task::class);
    }
}