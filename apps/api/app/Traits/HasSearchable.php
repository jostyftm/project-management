<?php

namespace App\Traits;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Collection;
use Spatie\QueryBuilder\QueryBuilder;

trait HasSearchable
{
    /**
     * Performs a search query on the model with optional relationships, filters, sorting, and pagination.
     *
     * @param  Request  $request  The HTTP request instance containing query parameters for sorting, filtering, and pagination.
     * @param  array  $relationships  The relationships to eager load with the query.
     * @param  Closure|null  $callback  An optional callback to further customize the query builder.
     * @param  array|null  $filters  Optional filters to apply to the query.
     * @return QueryBuilder|Collection|AbstractPaginator Returns a paginated result if 'paginate' is true in the request,
     *                                                   otherwise returns a collection of results.
     */
    public function search(
        Request $request,
        array $relationships = [],
        ?Closure $callback = null,
        ?array $filters = [],
        ?array $sorts = []
    ): QueryBuilder|Collection|AbstractPaginator {
        $builder = QueryBuilder::for($this::class)->with($relationships);

        if ($request->has('include')) {
            $builder->allowedIncludes($request->input('include'));
        }

        if ($callback) {
            $callback($builder);
        }

        if (! empty($filters)) {
            $builder->allowedFilters($filters);
        }

        if ($request->has('sort')) {
            $sorts = array_merge($sorts, [$request->input('sort')]);
            $builder->allowedSorts($sorts);
        }

        if ($request->boolean('paginate')) {
            return $builder->paginate($request->limit ?? 10)
                ->setPath($this->resolveRootUrl().'/'.request()->path())
                ->appends(request()->query());
        } else {
            return $builder->get();
        }
    }

    private function resolveRootUrl(): string
    {
        return config('app.env') === 'production' ? config('app.prod_url') : config('app.url');
    }
}
