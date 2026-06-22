import type { OrganizationDto } from '@sarel/shared';
import { AdminResourcePage } from '../../components/AdminResourcePage';
import { adminApi } from '../../lib/api';
import { useAuth } from '../../auth/AuthContext';

export function OrganizationsPage(): JSX.Element {
  const { user } = useAuth();
  const canManage = user?.permissions.includes('organization.manage') ?? false;
  return (
    <AdminResourcePage<OrganizationDto>
      config={{
        title: 'Organizations',
        canManage,
        api: adminApi.organizations,
        getId: (r) => r.id,
        getStatus: (r) => r.status,
        toEditValues: (r) => ({ code: r.code, name: r.name }),
        columns: [
          { header: 'Kode', value: (r) => r.code },
          { header: 'Nama', value: (r) => r.name },
          { header: 'Status', value: (r) => r.status },
        ],
        createFields: [
          { name: 'code', label: 'Kode', required: true },
          { name: 'name', label: 'Nama', required: true },
        ],
      }}
    />
  );
}
