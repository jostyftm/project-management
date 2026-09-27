<?php

namespace App\Services;

use App\Models\Page;
use App\Models\PageView;

class PageAnalyticsService
{
    public function getAnalytics(Page $page): array
    {
        $blocks = $page->content_json ?? [];
        $blockCount = count($blocks);

        // Calculate word count
        $allText = '';
        foreach ($blocks as $block) {
            $allText .= ' '.($block['content'] ?? '');
            if (isset($block['tableData']) && is_array($block['tableData'])) {
                foreach ($block['tableData'] as $row) {
                    if (is_array($row)) {
                        $allText .= ' '.implode(' ', $row);
                    }
                }
            }
        }

        $cleanText = trim(preg_replace('/\s+/', ' ', $allText));
        $wordCount = $cleanText !== '' ? str_word_count($cleanText) : 0;
        $characterCount = strlen($cleanText);
        $readingTimeMinutes = $wordCount > 0 ? (int) ceil($wordCount / 200) : 1;

        // Analytics from PageView
        $totalViews = $page->views_count;
        $uniqueViewers = PageView::where('page_id', $page->id)
            ->whereNotNull('user_id')
            ->distinct('user_id')
            ->count('user_id');

        // Recent viewers
        $recentViewers = PageView::where('page_id', $page->id)
            ->with('user:id,name,email')
            ->whereNotNull('user_id')
            ->orderByDesc('viewed_at')
            ->take(5)
            ->get()
            ->map(fn ($pv) => [
                'user' => $pv->user ? [
                    'id' => $pv->user->id,
                    'name' => $pv->user->name,
                    'email' => $pv->user->email,
                ] : null,
                'viewed_at' => $pv->viewed_at?->toISOString(),
            ]);

        return [
            'page_id' => $page->id,
            'title' => $page->title,
            'total_views' => $totalViews,
            'unique_viewers' => $uniqueViewers,
            'word_count' => $wordCount,
            'character_count' => $characterCount,
            'block_count' => $blockCount,
            'reading_time_minutes' => $readingTimeMinutes,
            'created_at' => $page->created_at?->toISOString(),
            'updated_at' => $page->updated_at?->toISOString(),
            'creator' => $page->creator ? [
                'id' => $page->creator->id,
                'name' => $page->creator->name,
                'email' => $page->creator->email,
            ] : null,
            'last_editor' => $page->lastEditor ? [
                'id' => $page->lastEditor->id,
                'name' => $page->lastEditor->name,
                'email' => $page->lastEditor->email,
            ] : null,
            'recent_views' => $recentViewers,
        ];
    }
}
