import type { BatchDto } from '@sarel/shared';
import { AdminResourcePage } from '../../components/AdminResourcePage';
import { adminApi } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';

export function BatchesPage(): JSX.Element {
  const { user } = useAuth();
  const canManage = user?.permissions.includes('batch.manage') ?? false;
  return (
    <AdminResourcePage<BatchDto>
      config={{
        title: 'Batches',
        canManage,
        api: adminApi.batches,
        getId: (r) => r.id,
        getStatus: (r) => r.status,
        // programId immutable saat edit.
        editFields: [
          { name: 'code', label: 'Kode', required: true },
          { name: 'name', label: 'Nama', required: true },
          { name: 'description', label: 'Deskripsi' },
          { name: 'orderIndex', label: 'Urutan', type: 'number' },
          { name: 'startDate', label: 'Tanggal Mulai (YYYY-MM-DD)' },
          { name: 'endDate', label: 'Tanggal Selesai (YYYY-MM-DD)' },
        ],
        toEditValues: (r) => ({
          code: r.code,
          name: r.name,
          description: r.description ?? '',
          orderIndex: String(r.orderIndex),
          startDate: r.startDate ?? '',
          endDate: r.endDate ?? '',
        }),
        columns: [
          { header: 'Kode', value: (r) => r.code },
          { header: 'Nama', value: (r) => r.name },
          { header: 'Program', value: (r) => r.programId },
          { header: 'Status', value: (r) => r.status },
        ],
        createFields: [
          { name: 'programId', label: 'Program ID', required: true },
          { name: 'code', label: 'Kode', required: true },
          { name: 'name', label: 'Nama', required: true },
          { name: 'description', label: 'Deskripsi' },
          { name: 'orderIndex', label: 'Urutan', type: 'number' },
          { name: 'startDate', label: 'Tanggal Mulai (YYYY-MM-DD)' },
          { name: 'endDate', label: 'Tanggal Selesai (YYYY-MM-DD)' },
        ],
      }}
    />
  );
}
