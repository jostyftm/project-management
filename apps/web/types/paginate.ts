interface PaginaeLinkType {
  url: string | null;
  label: string;
  page: number | null;
  active: boolean;
}

export interface MetaPaginateType {
  current_page: number;
  from: number;
  last_page: number;
  links?: PaginaeLinkType[];
  path: string;
  per_page: number;
  to: number;
  total: number;
}

export interface LinksPaginate {
  first: string | null;
  last: string | null;
  next: string | null;
  prev: string | null;
}

export interface PaginateResourcesProps<
  F extends Record<string, string> = Record<string, string>,
  T extends Record<string, unknown> = Record<string, unknown>
> {
  params: {
    paginate?: boolean | number;
    page?: string | number;
    filter?: F;
    limit?: number;
    sort?: string;
    only_trashed?: boolean | number;
  } & T;
}

export type PaginatedResponse<T> = {
  data: T[];
  links?: LinksPaginate;
  meta?: MetaPaginateType;
};

export type ApiResponse<T> = {
  data: T;
};
