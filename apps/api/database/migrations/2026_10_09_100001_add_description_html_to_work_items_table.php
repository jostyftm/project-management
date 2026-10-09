<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('work_items', function (Blueprint $table) {
            $table->longText('description_html')->nullable()->after('title');
        });

        // Backfill de registros históricos con description_json a description_html
        $items = DB::table('work_items')
            ->whereNotNull('description_json')
            ->select('id', 'description_json')
            ->get();

        foreach ($items as $item) {
            $decoded = json_decode($item->description_json, true);
            if (! $decoded) {
                continue;
            }

            $html = $this->convertJsonToHtml($decoded);
            if (! empty($html)) {
                DB::table('work_items')
                    ->where('id', $item->id)
                    ->update(['description_html' => $html]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_items', function (Blueprint $table) {
            $table->dropColumn('description_html');
        });
    }

    /**
     * Convierte estructuras legacy JSON a HTML semántico estándar.
     */
    private function convertJsonToHtml(mixed $data): string
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
            // Objeto envoltorio con clave 'html'
            if (isset($data['html']) && is_string($data['html'])) {
                return $data['html'];
            }
            if (isset($data['text']) && is_string($data['text'])) {
                return '<p>'.htmlspecialchars($data['text'], ENT_QUOTES, 'UTF-8').'</p>';
            }

            // Lista de bloques Notion
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
};
