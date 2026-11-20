// Traducción entre la URL de /reports y los query params de GET /admin/reports (02 §6).
import { CATEGORY_KEYS, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, STATUS_KEYS } from '../../core/constants';
import type { AdminReportFilters, IncidentCategory, ReportStatus } from '../../types/report';
import { dayEndToISO, dayStartToISO } from '../../utils/date';
import type { ReportFilterValues } from './ReportFilters';

export interface ReportsUrlState extends ReportFilterValues {
  page: number;
  pageSize: number;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function positiveInt(raw: string | null, fallback: number, max = Number.MAX_SAFE_INTEGER): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, max) : fallback;
}

export function parseReportsUrl(params: URLSearchParams): ReportsUrlState {
  const status = params.get('status');
  const category = params.get('category');
  const start = params.get('start');
  const end = params.get('end');
  const search = params.get('search')?.trim();
  return {
    status: STATUS_KEYS.includes(status as ReportStatus) ? (status as ReportStatus) : undefined,
    category: CATEGORY_KEYS.includes(category as IncidentCategory) ? (category as IncidentCategory) : undefined,
    start: start && DAY_RE.test(start) ? start : undefined,
    end: end && DAY_RE.test(end) ? end : undefined,
    search: search || undefined,
    page: positiveInt(params.get('page'), 1),
    pageSize: positiveInt(params.get('page_size'), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
  };
}

export function toReportsUrl(state: ReportsUrlState): URLSearchParams {
  const out = new URLSearchParams();
  if (state.status) out.set('status', state.status);
  if (state.category) out.set('category', state.category);
  if (state.start) out.set('start', state.start);
  if (state.end) out.set('end', state.end);
  if (state.search) out.set('search', state.search);
  if (state.page > 1) out.set('page', String(state.page));
  if (state.pageSize !== DEFAULT_PAGE_SIZE) out.set('page_size', String(state.pageSize));
  return out;
}

export function toApiFilters(state: ReportsUrlState): AdminReportFilters {
  return {
    status: state.status,
    category: state.category,
    start_date: state.start ? dayStartToISO(state.start) : undefined,
    end_date: state.end ? dayEndToISO(state.end) : undefined,
    search: state.search,
    page: state.page,
    page_size: state.pageSize,
  };
}
