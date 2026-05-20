import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../components/auth/AuthContext";
import WaveBackground from "../components/WaveBackground";

export default function Home() {
  const { user } = useAuth();

  if (user?.role === "admin" || user?.role === "superadmin") {
    return <Navigate to="/admin" replace />;
  }

  const isAuthenticated = !!user;
  const dashboardLink = isAuthenticated ? "/admin" : "/login";
  const importLink = isAuthenticated ? "/admin/import" : "/login";
  const analyticsLink = isAuthenticated ? "/admin/analytics" : "/login";

  const actionLabel = isAuthenticated ? "Go to dashboard" : "Sign in";
  const actionSubtext = isAuthenticated
    ? "You are signed in. Manage confession imports and analytics in the admin dashboard."
    : "Sign in to import confessions and view analytics in the admin dashboard.";

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <WaveBackground
        height="420px"
        position="bottom"
        opacity={0.18}
        animate={true}
        className="pointer-events-none absolute inset-x-0 bottom-0"
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-24 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <span className="inline-flex rounded-full bg-[#004687] px-3 py-1 text-sm font-semibold uppercase tracking-widest text-slate-100">
            Admin portal
          </span>
          <h1 className="mt-8 text-5xl font-semibold tracking-tight sm:text-6xl">
            Centralized confession ingestion and analytics for admins
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
            Securely manage bulk confession imports, monitor sentiment analytics, and keep your dataset current from one admin interface.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              to={dashboardLink}
              className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-slate-900/10 transition hover:bg-slate-100"
            >
              {actionLabel}
            </Link>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-slate-300">{actionSubtext}</p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20">
            <h2 className="text-xl font-semibold text-white">Import Confessions</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Use the admin dashboard to upload JSON confession batches and keep analytics fresh.
            </p>
            <Link
              to={importLink}
              className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100 transition"
            >
              {isAuthenticated ? "Open import panel" : "Sign in to import"}
            </Link>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20">
            <h2 className="text-xl font-semibold text-white">View Analytics</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Review sentiment, vibe score, and risk metrics in the dashboard once authenticated.
            </p>
            <Link
              to={analyticsLink}
              className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100 transition"
            >
              {isAuthenticated ? "Open analytics" : "Sign in to view"}
            </Link>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20">
            <h2 className="text-xl font-semibold text-white">Admin dashboard</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              This interface is designed for authenticated admins to manage confession ingestion and analytics in one place.
            </p>
            <Link
              to={dashboardLink}
              className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100 transition"
            >
              {isAuthenticated ? "Go to dashboard" : "Sign in now"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
