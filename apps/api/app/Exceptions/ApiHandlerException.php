<?php

namespace App\Exceptions;

use App\Traits\HasApiResponse;
use Exception;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class ApiHandlerException extends Exception
{
    use HasApiResponse;

    private $exception;

    public function __construct(Exception $e)
    {
        $this->exception = $e;
    }

    /**
     * Render an exception into an HTTP response.
     *
     * @param  Request  $request
     * @param  Throwable  $e
     * @return \Symfony\Component\HttpFoundation\Response
     *
     * @throws Throwable
     */
    public function render()
    {
        $response = $this->handleException($this->exception);

        return $response;
    }

    /**
     * Handle a Exception
     *
     * @param  Request  $request
     * @return array
     */
    public function handleException(Exception $exception)
    {

        if ($exception instanceof AuthenticationException) {
            return $this->errorResponse([], $message = $exception->getMessage(), 401);
        }

        if ($exception instanceof AccessDeniedHttpException) {
            return $this->errorResponse([], $message = $exception->getMessage(), 403);
        }

        if ($exception instanceof ModelNotFoundException) {
            return $this->errorResponse([], __('No result'), 404);
        }

        if ($exception instanceof NotFoundHttpException) {
            return $this->errorResponse([], __('The specified url is invalid'), 404);
        }

        if ($exception instanceof MethodNotAllowedHttpException) {
            return $this->errorResponse([], $message = __('The method is invalid'), 405);
        }

        if ($exception instanceof ValidationException) {
            return $this->errorResponse($exception->errors(), __('Validation error'), 422);
        }

        if ($exception instanceof HttpException) {
            return $this->errorResponse([], $exception->getMessage(), $exception->getStatusCode());
        }

        if ($exception instanceof QueryException) {
            return $this->resolveQueryException($exception);
        }

        if ($exception instanceof InvalidArgumentException) {
            return $this->errorResponse([], $exception->getMessage(), 500);
        }

        if ($exception instanceof \UnexpectedValueException) {
            return $this->errorResponse([], $exception->getMessage(), $exception->getCode());
        }

        if (config('app.debug')) {
            dd($exception);
        }

        return $this->errorResponse([], __('Unexpected Exception. Try later'), 500);
    }

    /**
     * @param  QueryException  $exception
     * @return Response
     */
    private function resolveQueryException(QueryException $e)
    {
        $errorInfo = $e->errorInfo;

        switch ($errorInfo[1]) {
            case 1062:
                return $this->errorResponse([], __('Duplicate registration'), 500);
                break;
            default:
                return $this->errorResponse([], __('Error when manipulating the database'), 500);
                break;
        }
    }
}
