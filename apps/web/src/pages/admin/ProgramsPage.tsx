import type { ProgramDto } from '@sarel/shared';
import { AdminResourcePage } from '../../components/AdminResourcePage';
import { adminApi } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';

export function ProgramsPage(): JSX.Element {
  const { user } = useAuth();
  const canManage = user?.permissions.includes('program.manage') ?? false;
  return (
    <AdminResourcePage<ProgramDto>
      config={{
        title: 'Programs',
        canManage,
        api: adminApi.programs,
        getId: (r) => r.id,
        getStatus: (r) => r.status,
        toEditValues: (r) => ({
          code: r.code,
          name: r.name,
          description: r.description ?? '',
          organizationId: r.organizationId ?? '',
          year: r.year != null ? String(r.year) : '',
          startDate: r.startDate ?? '',
          endDate: r.endDate ?? '',
        }),
        columns: [
          { header: 'Kode', value: (r) => r.code },
          { header: 'Nama', value: (r) => r.name },
          { header: 'Organization', value: (r) => r.organizationId ?? '-' },
          { header: 'Status', value: (r) => r.status },
        ],
        createFields: [
          { name: 'code', label: 'Kode', required: true },
          { name: 'name', label: 'Nama', required: true },
          { name: 'description', label: 'Deskripsi' },
          { name: 'organizationId', label: 'Organization ID' },
          { name: 'year', label: 'Tahun', type: 'number' },
          { name: 'startDate', label: 'Tanggal Mulai (YYYY-MM-DD)' },
          { name: 'endDate', label: 'Tanggal Selesai (YYYY-MM-DD)' },
        ],
      }}
    />
  );
}
