"use client";

import { useState, useRef } from "react";
import {
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Monitor,
  ArrowRightLeft,
  Clock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface DeviceReport {
  brand: string;
  model: string;
  deviceType: "mobile" | "computer";
  identifier: string;
  identifierType: "IMEI" | "Serial Number";
  status: "Clean" | "Flagged";
  flagReason?: string;
  registeredAt: string;
  currentOwner: string;
}

interface TransferRecord {
  transferredAt: string;
  from: string;
  to: string;
  price: number;
  notes?: string;
}

interface SearchResult {
  success: boolean;
  found: boolean;
  message?: string;
  device?: DeviceReport;
  transferHistory?: TransferRecord[];
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q || q.replace(/\D/g, "").length < 4 && q.length < 4) {
      setError("Enter at least 4 characters to search.");
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data: SearchResult = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error: string }).error ?? "Search failed");
      setResult(data);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
              >
                <ArrowLeft size={16} />
                Dashboard
              </Link>
              <div className="w-px h-5 bg-slate-200" />
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-full">
                  <ShieldCheck className="text-white w-4 h-4" />
                </div>
                <span className="text-lg font-bold tracking-tight">
                  DILI<span className="text-blue-600">VENTURES</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white py-16 px-6">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium">
            <ShieldCheck size={14} />
            Device Verification
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Search Any Device
          </h1>
          <p className="text-blue-100 text-lg">
            Enter an IMEI number or serial number to instantly check a device's status,
            ownership history, and legitimacy.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="mt-8">
            <div className="flex gap-2 max-w-xl mx-auto">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter IMEI or serial number..."
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-slate-900 text-sm bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-lg"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3.5 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 disabled:opacity-60 transition-colors shadow-lg text-sm"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
            {error && (
              <p className="text-red-200 text-sm mt-3 flex items-center justify-center gap-1.5">
                <AlertCircle size={14} /> {error}
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Results */}
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Checking device registry...</p>
          </div>
        )}

        {result && !loading && (
          <>
            {!result.found ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search size={20} className="text-slate-400" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-2">Device Not Found</h3>
                <p className="text-sm text-slate-500">{result.message}</p>
              </div>
            ) : (
              <>
                {/* Device Status Card */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600">
                      {result.device!.deviceType === "computer" ? (
                        <Monitor size={22} />
                      ) : (
                        <Smartphone size={22} />
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-slate-900">
                        {result.device!.brand} {result.device!.model}
                      </h2>
                      <p className="text-xs font-mono text-slate-500">
                        {result.device!.identifierType}: {result.device!.identifier}
                      </p>
                    </div>
                    <StatusBadge status={result.device!.status} />
                  </div>

                  <div className="px-6 py-5 grid grid-cols-2 gap-4">
                    <InfoRow label="Device Type" value={result.device!.deviceType === "computer" ? "Computer" : "Mobile Phone"} />
                    <InfoRow label="Current Owner" value={result.device!.currentOwner} />
                    <InfoRow
                      label="Registered"
                      value={new Date(result.device!.registeredAt).toLocaleDateString("en-US", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    />
                    {result.device!.flagReason && (
                      <InfoRow label="Flag Reason" value={result.device!.flagReason} highlight />
                    )}
                  </div>

                  {result.device!.status === "Clean" ? (
                    <div className="mx-6 mb-5 p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <p className="text-xs font-medium text-emerald-800">
                        This device is clean — not reported stolen or flagged.
                      </p>
                    </div>
                  ) : (
                    <div className="mx-6 mb-5 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                      <AlertCircle size={16} className="text-red-600" />
                      <p className="text-xs font-medium text-red-800">
                        Warning: This device has been flagged.{" "}
                        {result.device!.flagReason ? `Reason: ${result.device!.flagReason}` : ""}
                      </p>
                    </div>
                  )}
                </div>

                {/* Transfer History */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                    <ArrowRightLeft size={16} className="text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      Ownership History
                    </h3>
                    <span className="ml-auto text-xs text-slate-400">
                      {result.transferHistory!.length} transfer{result.transferHistory!.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {result.transferHistory!.length === 0 ? (
                    <div className="px-6 py-8 text-center">
                      <Clock size={28} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-sm text-slate-500">No ownership transfers recorded.</p>
                      <p className="text-xs text-slate-400 mt-1">This device has remained with its original owner.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {result.transferHistory!.map((t, i) => (
                        <div key={i} className="px-6 py-4 flex items-center gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                            <ArrowRightLeft size={14} className="text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-800">
                              <span className="font-medium">{t.from}</span>
                              {" → "}
                              <span className="font-medium">{t.to}</span>
                            </p>
                            {t.notes && (
                              <p className="text-xs text-slate-400 truncate mt-0.5">{t.notes}</p>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-right">
                            {t.price > 0 && (
                              <p className="text-sm font-bold text-slate-800">${t.price.toFixed(2)}</p>
                            )}
                            <p className="text-xs text-slate-400">
                              {new Date(t.transferredAt).toLocaleDateString("en-US", {
                                year: "numeric", month: "short", day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* Tips when no search yet */}
        {!result && !loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Smartphone, title: "Mobile Phones", desc: "Search by 15-digit IMEI. Dial *#06# to find it." },
              { icon: Monitor, title: "Computers", desc: "Search by serial number found on the device label or in system settings." },
              { icon: ShieldCheck, title: "Instant Report", desc: "See current status, ownership history, and flag reasons." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Icon size={20} className="text-blue-600" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">{title}</h4>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: "Clean" | "Flagged" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
        status === "Clean"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {status === "Clean" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
      {status}
    </span>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-medium ${highlight ? "text-red-600" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}
