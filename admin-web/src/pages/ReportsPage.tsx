// /reports — listado tabular y filtros (04 §5.2, PROJECT_CONTEXT §3.B).
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { ReportFilters, type ReportFilterValues } from '../components/reports/ReportFilters';
import { ReportTable } from '../components/reports/ReportTable';
import { parseReportsUrl, toApiFilters, toReportsUrl } from '../components/reports/report-query';
import { useReports } from '../hooks/use-reports';

export function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => parseReportsUrl(params), [params]);
  const filters = useMemo(() => toApiFilters(state), [state]);
  const { data, isLoading, isFetching, error } = useReports(filters);

  const update = useCallback(
    (patch: Partial<typeof state>) => setParams(toReportsUrl({ ...parseReportsUrl(params), ...patch })),
    [params, setParams],
  );

  const onFiltersChange = useCallback(
    (patch: Partial<ReportFilterValues>) => update({ ...patch, page: 1 }),
    [update],
  );

  return (
    <div className="p-6">
      <PageHeader title="Reportes" />

      <ReportFilters
        values={state}
        onChange={onFiltersChange}
        onReset={() => setParams(toReportsUrl({ page: 1, pageSize: state.pageSize }))}
      />

      {error && (
        <div role="alert" className="mt-3 rounded-field border border-brand/30 bg-brand-soft px-3 py-2 text-sm text-brand-dark">
          {error.message}
        </div>
      )}

      <div className="mt-3">
        <ReportTable
          data={data}
          loading={isLoading}
          fetching={isFetching}
          onPageChange={(page) => update({ page })}
          onPageSizeChange={(pageSize) => update({ pageSize, page: 1 })}
        />
      </div>
    </div>
  );
}
