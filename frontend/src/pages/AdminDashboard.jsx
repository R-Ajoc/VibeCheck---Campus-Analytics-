import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Admin</h1>
              <p className="mt-2 text-sm text-slate-600">Choose an action: import confessions or view analytics.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Import confessions</h2>
            <p className="mt-3 text-sm text-slate-600">
              Paste or upload confession JSON here to ingest new data into the system.
            </p>
            <Link
              to="/admin/import"
              className="mt-8 inline-flex items-center justify-center rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Go to import page
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-900">Analytics dashboard</h2>
            <p className="mt-3 text-sm text-slate-600">
              View sentiment, vibe scores, and key risk signals once your confessions have been processed.
            </p>
            <Link
              to="/admin/analytics"
              className="mt-8 inline-flex items-center justify-center rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              View analytics
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
