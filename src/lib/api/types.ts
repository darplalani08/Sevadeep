export type { Ngo } from "@content/ngos";
export type { Need } from "@content/needs";
export type { BlogPost } from "@content/blog";

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type NgoFilters = {
  search?: string;
  city?: string;
  area?: string;
  category?: string;
  page?: number;
  pageSize?: number;
};

export type NeedFilters = {
  search?: string;
  location?: string;
  category?: string;
  page?: number;
  pageSize?: number;
};
