export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface APIErrorDetail {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  timestamp: string;
}

export interface APIErrorResponse {
  error: APIErrorDetail;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  address_reference?: string;
  display_text?: string;
}
