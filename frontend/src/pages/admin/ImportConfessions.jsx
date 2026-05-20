import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { importConfessions, getAnalytics } from "../../services/api";

export default function ImportConfessions() {
  const [jsonText, setJsonText] = useState("");
  const [fileName, setFileName] = useState("");
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [importing, setImporting] = useState(false);

  const [absaProcessing, setAbsaProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(null);
  const [importedTotal, setImportedTotal] = useState(null);
  const [absaDone, setAbsaDone] = useState(false);

  const pollRef = useRef(null);
  const stableRef = useRef(0);
  const lastCountRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPolling = (total) => {
    stableRef.current = 0;
    lastCountRef.current = null;

    pollRef.current = setInterval(async () => {
      try {
        const data = await getAnalytics();
        const count = data?.confession_count ?? 0;
        setProcessedCount(count);

        if (count === lastCountRef.current) {
          stableRef.current += 1;
        } else {
          stableRef.current = 0;
        }
        lastCountRef.current = count;

        // consider done when count is stable for 3 consecutive polls (12 seconds)
        // or when processed count matches what we imported
        if (stableRef.current >= 3 || count >= total) {
          stopPolling();
          setAbsaProcessing(false);
          setAbsaDone(true);
        }
      } catch {
        // keep polling silently on error
      }
    }, 4000);
  };

  useEffect(() => () => stopPolling(), []);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) { setFileName(""); return; }
    setFileName(file.name);
    const fileText = await file.text();
    setJsonText(fileText);
    setStatusMessage(`Loaded ${file.name}.`);
    setErrorMessage(null);
  };

  const handleImport = async (event) => {
    event.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);
    setAbsaDone(false);
    setAbsaProcessing(false);
    setProcessedCount(null);
    setImportedTotal(null);
    stopPolling();

    if (!jsonText.trim()) {
      setErrorMessage("Please paste a JSON array or upload a file before importing.");
      return;
    }

    let payload;
    try {
      payload = JSON.parse(jsonText);
    } catch {
      setErrorMessage("Invalid JSON format. Please provide a valid JSON array.");
      return;
    }

    if (!Array.isArray(payload)) {
      setErrorMessage("Import payload must be a JSON array of confessions.");
      return;
    }

    setImporting(true);
    try {
      const imported = await importConfessions(payload);
      const total = imported.length;
      setImportedTotal(total);
      setJsonText("");
      setFileName("");
      setAbsaProcessing(true);
      startPolling(total);
    } catch (err) {
      const serverError = err.response?.data?.detail || err.response?.data || err.message;
      setErrorMessage(typeof serverError === "string" ? serverError : "Failed to import confessions.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">Import Confessions</h1>
              <p className="mt-2 text-sm text-slate-600">
                Paste or upload a JSON batch of confessions to ingest them and trigger ABSA processing.
              </p>
            </div>
            <Link
              to="/admin"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Back to dashboard
            </Link>
          </div>
        </div>

        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <form onSubmit={handleImport} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-[0.7fr_1.3fr]">
              <label className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <span className="font-medium text-slate-900">Upload JSON file</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="mt-4 w-full text-sm text-slate-700 file:rounded-full file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-slate-900"
                />
                {fileName && <span className="mt-3 text-xs text-slate-500">Selected file: {fileName}</span>}
              </label>

              <label className="flex flex-col rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <span className="font-medium text-slate-900">Paste JSON</span>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder='[ { "content": "Sample confession text...", "source": "scraped", "post_date": "2026-05-19T12:00:00Z" } ]'
                  className="mt-4 min-h-[260px] resize-none rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2 text-sm text-slate-600">
                <p>Imported confessions will be stored and analyzed automatically.</p>
                <p>Paste a JSON array and click import to add new records to the system.</p>
              </div>
              <button
                type="submit"
                disabled={importing || absaProcessing}
                className="inline-flex items-center justify-center rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {importing ? "Importing..." : "Import confessions"}
              </button>
            </div>

            {errorMessage && (
              <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm shadow-sm">
                <p className="text-red-600">{errorMessage}</p>
              </div>
            )}

            {absaProcessing && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 animate-spin text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <p className="text-sm font-medium text-slate-700">
                    Analyzing confessions...
                    {processedCount !== null && importedTotal !== null && (
                      <span className="ml-1 text-slate-500">
                        {processedCount} of {importedTotal} processed
                      </span>
                    )}
                  </p>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-slate-700 transition-all duration-500"
                    style={{
                      width: importedTotal
                        ? `${Math.min(100, Math.round((processedCount / importedTotal) * 100))}%`
                        : "10%",
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">This may take a minute depending on batch size.</p>
              </div>
            )}

            {absaDone && (
              <div className="rounded-3xl border border-green-200 bg-green-50 px-5 py-4 shadow-sm">
                <p className="text-sm font-medium text-green-800">
                  ✓ {importedTotal} confession{importedTotal !== 1 ? "s" : ""} imported and analyzed successfully.
                </p>
                <Link
                  to="/admin/analytics"
                  className="mt-3 inline-flex items-center justify-center rounded-full bg-green-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-green-800"
                >
                  View analytics →
                </Link>
              </div>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}