<?php

namespace App\Models;

use App\Traits\BelongsToWorkspace;
use App\Traits\HasCacheInvalidation;
use App\Traits\HasSearchable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkItem extends Model
{
    use BelongsToWorkspace, HasCacheInvalidation, HasFactory, HasSearchable;

    protected $fillable = [
        'workspace_id',
        'project_id',
        'sequence_id',
        'title',
        'description_html',
        'description_json',
        'state_id',
        'type_id',
        'priority',
        'parent_id',
        'lead_id',
        'milestone_id',
        'estimate_points',
        'estimate_value',
        'start_date',
        'target_date',
        'completed_at',
        'is_draft',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'sequence_id' => 'integer',
            'description_json' => 'array',
            'estimate_points' => 'float',
            'start_date' => 'date',
            'target_date' => 'date',
            'completed_at' => 'datetime',
            'is_draft' => 'boolean',
        ];
    }

    public function getCacheKeyPattern(): string
    {
        return 'work_item_{id}';
    }

    public function getCacheTags(): array
    {
        return ['work_items', 'project_'.$this->project_id];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function state(): BelongsTo
    {
        return $this->belongsTo(State::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lead_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(WorkItem::class, 'parent_id');
    }

    public function subItems(): HasMany
    {
        return $this->hasMany(WorkItem::class, 'parent_id');
    }

    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'work_item_assignees');
    }

    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(Label::class, 'work_item_labels');
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(WorkItemType::class, 'type_id');
    }

    public function cycles(): BelongsToMany
    {
        return $this->belongsToMany(Cycle::class, 'cycle_work_items')
            ->using(CycleWorkItem::class)
            ->withPivot(['status_at_completion', 'transferred_to_cycle_id'])
            ->withTimestamps();
    }

    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(Module::class, 'module_work_items');
    }

    public function milestone(): BelongsTo
    {
        return $this->belongsTo(Milestone::class);
    }

    public function milestones(): BelongsToMany
    {
        return $this->belongsToMany(Milestone::class, 'milestone_work_items')->withTimestamps();
    }

    public function outwardRelations(): HasMany
    {
        return $this->hasMany(WorkItemRelation::class, 'source_id');
    }

    public function inwardRelations(): HasMany
    {
        return $this->hasMany(WorkItemRelation::class, 'target_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->latest();
    }

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class, 'entity_id')
            ->where('entity_type', 'WORK_ITEM')
            ->latest();
    }

    public function githubPullRequests(): HasMany
    {
        return $this->hasMany(GithubPullRequest::class)->latest();
    }

    public function githubCommits(): HasMany
    {
        return $this->hasMany(GithubCommit::class)->latest('committed_at');
    }

    public function deliverables(): HasMany
    {
        return $this->hasMany(WorkItemDeliverable::class)->latest();
    }

    public function dodItems(): HasMany
    {
        return $this->hasMany(WorkItemDodItem::class)->oldest();
    }

    /**
     * Accesor para description_html con fallback a description_json legado.
     */
    public function getDescriptionHtmlAttribute(?string $value): ?string
    {
        if ($value !== null) {
            return $value;
        }

        if (! empty($this->description_json)) {
            return $this->resolveLegacyJsonToHtml($this->description_json);
        }

        return null;
    }

    /**
     * Alias amigable para la descripción en HTML.
     */
    public function getDescriptionAttribute(): ?string
    {
        return $this->description_html;
    }

    /**
     * Mutador para el alias description.
     */
    public function setDescriptionAttribute(?string $value): void
    {
        $this->attributes['description_html'] = $value;
    }

    /**
     * Convierte estructuras legadas de description_json a HTML.
     */
    public function resolveLegacyJsonToHtml(mixed $data): string
    {
        if (is_string($data)) {
            $trimmed = trim($data);
            if (empty($trimmed)) {
                return '';
            }
            if (preg_match('/<[a-z][\s\S]*>/i', $trimmed)) {
                return $trimmed;
            }

            return '<p>'.htmlspecialchars($trimmed, ENT_QUOTES, 'UTF-8').'</p>';
        }

        if (is_array($data)) {
            if (isset($data['html']) && is_string($data['html'])) {
                return $data['html'];
            }
            if (isset($data['text']) && is_string($data['text'])) {
                return '<p>'.htmlspecialchars($data['text'], ENT_QUOTES, 'UTF-8').'</p>';
            }

            $htmlParts = [];
            foreach ($data as $block) {
                if (! is_array($block)) {
                    continue;
                }
                $type = $block['type'] ?? 'paragraph';
                $content = htmlspecialchars($block['content'] ?? '', ENT_QUOTES, 'UTF-8');

                switch ($type) {
                    case 'heading_1':
                        $htmlParts[] = "<h1>{$content}</h1>";
                        break;
                    case 'heading_2':
                    case 'heading':
                        $htmlParts[] = "<h2>{$content}</h2>";
                        break;
                    case 'heading_3':
                        $htmlParts[] = "<h3>{$content}</h3>";
                        break;
                    case 'bullet_list':
                        $htmlParts[] = "<ul><li>{$content}</li></ul>";
                        break;
                    case 'numbered_list':
                        $htmlParts[] = "<ol><li>{$content}</li></ol>";
                        break;
                    case 'todo':
                        $checked = ! empty($block['checked']) ? '☑' : '☐';
                        $htmlParts[] = "<p>{$checked} {$content}</p>";
                        break;
                    case 'quote':
                    case 'callout':
                        $htmlParts[] = "<blockquote>{$content}</blockquote>";
                        break;
                    case 'code':
                        $htmlParts[] = "<pre><code>{$content}</code></pre>";
                        break;
                    case 'divider':
                        $htmlParts[] = '<hr />';
                        break;
                    case 'table':
                        if (! empty($block['tableData']) && is_array($block['tableData'])) {
                            $rowsHtml = [];
                            foreach ($block['tableData'] as $rowIndex => $row) {
                                if (! is_array($row)) {
                                    continue;
                                }
                                $tag = $rowIndex === 0 ? 'th' : 'td';
                                $cells = array_map(fn ($cell) => "<{$tag}>".htmlspecialchars((string) $cell, ENT_QUOTES, 'UTF-8')."</{$tag}>", $row);
                                $rowsHtml[] = '<tr>'.implode('', $cells).'</tr>';
                            }
                            $htmlParts[] = '<table>'.implode('', $rowsHtml).'</table>';
                        }
                        break;
                    case 'paragraph':
                    default:
                        if (! empty($content)) {
                            $htmlParts[] = "<p>{$content}</p>";
                        }
                        break;
                }
            }

            return implode('', $htmlParts);
        }

        return '';
    }
}
