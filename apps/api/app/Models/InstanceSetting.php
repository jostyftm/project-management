<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InstanceSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'instance_name',
        'company_name',
        'app_url',
        'allow_signups',
        'invite_only',
        'allowed_domains',
        'smtp_host',
        'smtp_port',
        'smtp_username',
        'smtp_password',
        'smtp_from_email',
        'smtp_from_name',
        'smtp_encryption',
        'max_upload_size_mb',
        'enable_telemetry',
    ];

    protected $casts = [
        'allow_signups' => 'boolean',
        'invite_only' => 'boolean',
        'allowed_domains' => 'array',
        'enable_telemetry' => 'boolean',
        'smtp_port' => 'integer',
        'max_upload_size_mb' => 'integer',
    ];
}
