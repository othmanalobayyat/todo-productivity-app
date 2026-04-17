<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Task;
use App\Models\Subtask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubtaskAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_cannot_delete_another_users_subtask(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $task = Task::create([
            'user_id' => $owner->id,
            'title' => 'Owner Task',
            'description' => 'Private task',
            'completed' => false,
            'priority' => 'medium',
        ]);

        $subtask = Subtask::create([
            'task_id' => $task->id,
            'title' => 'Private Subtask',
            'completed' => false,
        ]);

        Sanctum::actingAs($intruder);

        $response = $this->deleteJson("/api/tasks/{$task->id}/subtasks/{$subtask->id}");

        $response->assertStatus(404);

        $this->assertDatabaseHas('subtasks', [
            'id' => $subtask->id,
            'task_id' => $task->id,
            'title' => 'Private Subtask',
        ]);
    }

    public function test_user_cannot_toggle_another_users_subtask(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $task = Task::create([
            'user_id' => $owner->id,
            'title' => 'Owner Task',
            'description' => 'Private task',
            'completed' => false,
            'priority' => 'medium',
        ]);

        $subtask = Subtask::create([
            'task_id' => $task->id,
            'title' => 'Private Subtask',
            'completed' => false,
        ]);

        Sanctum::actingAs($intruder);

        $response = $this->patchJson("/api/tasks/{$task->id}/subtasks/{$subtask->id}/toggle");

        $response->assertStatus(404);

        $this->assertDatabaseHas('subtasks', [
            'id' => $subtask->id,
            'completed' => false,
        ]);
    }
}