// Tipos comunes — docs/tecnica/02. system-contracts.md §1.4, §1.5

/** Paginación estándar (§1.5). */
export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

/** Respuesta paginada genérica (§1.5). */
export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

/** Parámetros de paginación (§1.5). */
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

/** Cuerpo interno del error RFC 7807 (§1.4). */
export interface APIErrorBody {
  code: string;
  message: string;
  details: Record<string, unknown> | null;
  timestamp: string;
}

/** Respuesta de error RFC 7807 (§1.4). */
export interface APIErrorResponse {
  error: APIErrorBody;
}
