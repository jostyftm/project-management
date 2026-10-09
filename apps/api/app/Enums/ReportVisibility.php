<?php

namespace App\Enums;

enum ReportVisibility: string
{
    case DRAFT = 'draft';
    case PRIVATE = 'private';
    case WORKSPACE = 'workspace';
    case PUBLIC = 'public';

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public function label(): string
    {
        return match ($this) {
            self::DRAFT => 'Borrador',
            self::PRIVATE => 'Privado',
            self::WORKSPACE => 'Workspace',
            self::PUBLIC => 'Público',
        };
    }
}
