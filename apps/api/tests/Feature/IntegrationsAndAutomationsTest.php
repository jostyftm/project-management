<?php

namespace Tests\Feature;

use App\Models\AutomationRule;
use App\Models\Project;
use App\Models\RecurringWorkItem;
use App\Models\State;
use App\Models\User;
use App\Models\Webhook;
use App\Models\WorkItem;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class IntegrationsAndAutomationsTest extends TestCase
{
    use RefreshDatabase;

    protected Workspace $workspace;
    protected Project $project;
    protected State $defaultState;
    protected State $targetState;
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['email' => 'admin@test.com']);
        $this->actingAs($this->user);

        $this->workspace = Workspace::create([
            'name' => 'SDI Workspace',
            'slug' => 'sdi',
            'owner_id' => $this->user->id,
        ]);

        $this->project = Project::create([
            'workspace_id' => $this->workspace->id,
            'name' => 'SDI Project',
            'identifier' => 'SDI',
        ]);

        $this->defaultState = State::create([
            'workspace_id' => $this->workspace->id,
            'project_id' => $this->project->id,
            'name' => 'Backlog',
            'group' => 'BACKLOG',
            'sequence' => 1,
            'is_default' => true,
        ]);

        $this->targetState = State::create([
            'workspace_id' => $this->workspace->id,
            'project_id' => $this->project->id,
            'name' => 'Done',
            'group' => 'COMPLETED',
            'sequence' => 2,
        ]);
    }

    public function test_csv_preview_and_import(): void
    {
        $csvContent = "Título,Descripción,Prioridad,Estado\n" .
                      "Implementar autenticación,Detalle técnico de JWT,HIGH,Backlog\n" .
                      "Crear dashboard,Vista principal,MEDIUM,Done\n";

        // 1. Preview
        $previewRes = $this->postJson("/api/v1/projects/{$this->project->id}/import/csv/preview", [
            'csv_content' => $csvContent,
        ]);

        $previewRes->assertStatus(200);
        $previewData = $previewRes->json();
        $this->assertEquals(2, $previewData['total_rows']);
        $this->assertArrayHasKey('suggested_mapping', $previewData);

        // 2. Import
        $importRes = $this->postJson("/api/v1/projects/{$this->project->id}/import/csv", [
            'rows' => [
                ['Título' => 'Implementar autenticación', 'Descripción' => 'Detalle técnico de JWT', 'Prioridad' => 'HIGH', 'Estado' => 'Backlog'],
                ['Título' => 'Crear dashboard', 'Descripción' => 'Vista principal', 'Prioridad' => 'MEDIUM', 'Estado' => 'Done'],
            ],
            'column_mapping' => [
                'title' => 'Título',
                'description' => 'Descripción',
                'priority' => 'Prioridad',
                'state' => 'Estado',
            ],
        ]);

        $importRes->assertStatus(200);
        $this->assertEquals(2, $importRes->json('imported_count'));
        $this->assertDatabaseHas('work_items', ['title' => 'Implementar autenticación', 'priority' => 'HIGH']);
        $this->assertDatabaseHas('work_items', ['title' => 'Crear dashboard', 'priority' => 'MEDIUM']);
    }

    public function test_slack_integration_and_outgoing_webhook_ping(): void
    {
        // 1. Crear integración de Slack
        $slackRes = $this->postJson("/api/v1/integrations", [
            'provider' => 'SLACK',
            'name' => 'Canal Dev Alerts',
            'config' => [
                'webhook_url' => 'https://hooks.slack.com/services/test/mock',
                'channel_name' => '#dev-alerts',
            ],
        ], ['X-Workspace-Id' => $this->workspace->id]);

        $slackRes->assertStatus(201);
        $integrationId = $slackRes->json('id');

        // 2. Probar conexión
        $testRes = $this->postJson("/api/v1/integrations/{$integrationId}/test");
        $testRes->assertStatus(200);
        $this->assertTrue($testRes->json('success'));

        // 3. Crear Webhook saliente y probar ping
        $webhook = Webhook::create([
            'workspace_id' => $this->workspace->id,
            'url' => 'https://example.com/webhook-listener',
            'secret_token' => 'whsec_test',
            'events_subscribed' => ['*'],
            'is_active' => true,
        ]);

        $pingRes = $this->postJson("/api/v1/webhooks/{$webhook->id}/test");
        $pingRes->assertStatus(200);
        $this->assertTrue($pingRes->json('success'));
    }

    public function test_recurring_work_item_and_artisan_automations_command(): void
    {
        // 1. Crear plantilla de tarea periódica
        $recurring = RecurringWorkItem::create([
            'workspace_id' => $this->workspace->id,
            'project_id' => $this->project->id,
            'work_item_template' => [
                'title' => 'Revisión semanal de dependencias',
                'priority' => 'LOW',
            ],
            'frequency' => 'WEEKLY',
            'cron_expression' => '0 9 * * 1',
            'is_active' => true,
            'next_run_at' => now()->subMinute(), // Vencida para que se ejecute
            'created_by' => $this->user->id,
        ]);

        // 2. Ejecutar comando de consola de automatizaciones
        $this->artisan('plane:run-automations', ['--project' => $this->project->id])
            ->assertSuccessful();

        // 3. Verificar que la tarea periódica fue generada
        $this->assertDatabaseHas('work_items', [
            'project_id' => $this->project->id,
            'title' => 'Revisión semanal de dependencias',
            'priority' => 'LOW',
        ]);

        $recurring->refresh();
        $this->assertNotNull($recurring->last_run_at);
        $this->assertTrue($recurring->next_run_at->isFuture());
    }

    public function test_automation_rule_evaluation(): void
    {
        $item = WorkItem::create([
            'workspace_id' => $this->workspace->id,
            'project_id' => $this->project->id,
            'sequence_id' => 99,
            'title' => 'Bug crítico en producción',
            'priority' => 'URGENT',
            'state_id' => $this->defaultState->id,
            'created_by' => $this->user->id,
        ]);

        // Crear regla: Si prioridad es URGENT -> cambiar estado a 'Done'
        $rule = AutomationRule::create([
            'workspace_id' => $this->workspace->id,
            'project_id' => $this->project->id,
            'name' => 'Auto-completar tareas urgentes de prueba',
            'trigger_event' => 'WORK_ITEM_CREATED',
            'trigger_conditions' => ['priority' => 'URGENT'],
            'actions' => ['change_state_to' => $this->targetState->id],
            'is_active' => true,
        ]);

        $response = $this->postJson("/api/v1/automation-rules/{$rule->id}/test");
        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('applied_count'));

        $item->refresh();
        $this->assertEquals($this->targetState->id, $item->state_id);
    }
}
