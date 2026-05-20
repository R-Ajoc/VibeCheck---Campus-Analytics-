import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../components/auth/AuthContext";
import WaveBackground from "../components/WaveBackground";
import { IconUpload, IconChartBar, IconLayoutDashboard } from "@tabler/icons-react";

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
            Understand what students are saying, all in one place
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
            VibeCheck collects anonymous student confessions and turns them into clear, actionable insights. Import data, track sentiment trends, and spot emerging concerns before they escalate.
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
            <IconUpload size={20} color="#60a5fa" />
            <h2 className="mt-3 text-xl font-semibold text-white">Import confessions</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Upload confession batches in JSON format. The system processes and analyzes each entry automatically.
            </p>
            <Link
              to={importLink}
              className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100 transition"
            >
              {isAuthenticated ? "Open import panel" : "Sign in to import"}
            </Link>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20">
            <IconChartBar size={20} color="#34d399" />
            <h2 className="mt-3 text-xl font-semibold text-white">View analytics</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Explore sentiment scores, vibe trends, and aspect breakdowns across 8 campus categories.
            </p>
            <Link
              to={analyticsLink}
              className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100 transition"
            >
              {isAuthenticated ? "Open analytics" : "Sign in to view"}
            </Link>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl shadow-slate-950/20">
            <IconLayoutDashboard size={20} color="#fb923c" />
            <h2 className="mt-3 text-xl font-semibold text-white">Spot risk signals</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Get flagged when sentiment in areas like mental health or faculty behavior starts declining.
            </p>
            <Link
              to={dashboardLink}
              className="mt-6 inline-flex rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100 transition"
            >
              {isAuthenticated ? "Go to dashboard" : "Sign in to monitor"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}