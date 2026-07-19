interface AdminModulePlaceholderPageProps {
  title: string;
  description: string;
}

export function AdminModulePlaceholderPage({
  title,
  description,
}: AdminModulePlaceholderPageProps): JSX.Element {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-medium text-blue-600">
          Modul Administrasi
        </p>

        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          {title}
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          {description}
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="font-medium text-slate-700">
          Modul sedang disiapkan
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Struktur navigasi sudah tersedia. Fungsi, data, dan integrasi
          modul akan ditambahkan pada tahap pengembangan berikutnya.
        </p>
      </div>
    </section>
  );
}
