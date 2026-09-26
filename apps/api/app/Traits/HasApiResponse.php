<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait HasApiResponse
{
    protected function successResponse($data, $code = 200): JsonResponse
    {
        return response()->json([
            'status' => $code,
            'data' => $data,
        ], $code);
    }

    protected function errorResponse($data = null, $message = null, $code = 422): JsonResponse
    {
        return response()->json([
            'status' => $code,
            'message' => $message,
            'errors' => $data,
        ], $code);
    }
}
