<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TaskCategory;

class TaskCategorySeeder extends Seeder
{
    public function run()
    {
        $categories = ['Work', 'Personal', 'Shopping', 'Entertainment'];

        foreach ($categories as $category) {
            TaskCategory::create(['name' => $category]);
        }
    }
}
