// app/superadmin/system/page.js
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Cpu,
    CreditCard,
    Database,
    Loader2,
    Plug,
    RefreshCw,
    Server,
    Timer,
    XCircle,
    Activity,
} from "lucide-react";

import { getProfile } from "@/services/userService";
import { getSystemStatus } from "@/services/systemService";

const REFRESH_INTERVAL_MS = 30000;

// ---------- Formatter ----------
function formatNumber(value) {
    return new Intl.NumberFormat("id-ID").format(Number(value) || 0);
}

function formatBytes(bytes) {
    const n = Number(bytes) || 0;
    if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
    if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
    if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${n} B`;
}

function formatUptime(seconds) {
    const s = Number(seconds) || 0;
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d} hari ${h} jam`;
    if (h > 0) return `${h} jam ${m} menit`;
    return `${m} menit`;
}

function formatDateTime(value) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function timeAgo(value) {
    if (!value) return "belum pernah";
    const diff = Math.round((Date.now() - new Date(value).getTime()) / 1000);
    if (Number.isNaN(diff)) return "-";
    if (diff < 5) return "baru saja";
    if (diff < 60) return `${diff} detik lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
}

const STATUS_STYLE = {
    operational: { label: "OPERASIONAL", classes: "bg-[#E4F3EA] text-[#1E7A4C]", dot: "bg-[#1E7A4C]" },
    degraded: { label: "PERLU PERHATIAN", classes: "bg-[#FDF3D8] text-[#B4841F]", dot: "bg-[#B4841F]" },
    down: { label: "GANGGUAN", classes: "bg-[#F3E4E4] text-[#B3261E]", dot: "bg-[#B3261E]" },
};

const PAYMENT_STATUS_LABEL = {
    settlement: "Berhasil",
    capture: "Berhasil (kartu)",
    pending: "Menunggu",
    expire: "Kedaluwarsa",
    cancel: "Dibatalkan",
    deny: "Ditolak",
    refund: "Refund",
    failure: "Gagal",
};

// ---------- Komponen kecil ----------
function Card({ icon: Icon, title, subtitle, children, className = "" }) {
    return (
        <div className={`rounded-2xl bg-white p-6 shadow-sm ${className}`}>
            <div className="mb-4">
                <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-[#5B0F18]" />
                    <h2 className="text-lg font-bold text-[#1E1E1E]">{title}</h2>
                </div>
                {subtitle && <p className="mt-0.5 text-xs text-[#8C7777]">{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}

function StatCard({ label, value, note, icon: Icon, accent = "" }) {
    return (
        <div className={`rounded-2xl bg-white p-5 shadow-sm ${accent}`}>
            <div className="flex items-start justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8C7777]">{label}</p>
                <Icon className="h-4 w-4 text-[#8C7777]" />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#1E1E1E]">{value}</p>
            <p className="mt-1 text-xs text-[#8C7777]">{note}</p>
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F8F1E7] px-3 py-2 text-xs">
            <span className="text-[#8C7777]">{label}</span>
            <span className="truncate text-right font-semibold text-[#1E1E1E]">{value}</span>
        </div>
    );
}

function Bar({ percent, tone = "bg-[#5B0F18]" }) {
    const safe = Math.max(0, Math.min(100, Number(percent) || 0));
    return (
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#F0EDED]">
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${safe}%` }} />
        </div>
    );
}

function Empty({ children }) {
    return <div className="rounded-xl bg-[#F8F1E7] p-4 text-center text-xs text-[#8C7777]">{children}</div>;
}

export default function SystemConsolePage() {
    const router = useRouter();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const load = useCallback(async ({ silent = false } = {}) => {
        try {
            if (silent) setRefreshing(true);
            const res = await getSystemStatus();
            setData(res);
            setError(null);
        } catch (err) {
            setError(err.message || "Gagal memuat status sistem");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    // Guard login + role, lalu muat data pertama
    useEffect(() => {
        if (!Cookies.get("token")) {
            router.replace("/login");
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                const profile = await getProfile();
                if (cancelled) return;
                if ((profile?.role || "").toLowerCase() !== "superadmin") {
                    router.replace("/admin/dashboard");
                    return;
                }
                await load();
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || "Gagal memuat halaman");
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [router, load]);

    // Refresh berkala, dilewati saat tab tidak terlihat
    useEffect(() => {
        const id = setInterval(() => {
            if (!document.hidden) load({ silent: true });
        }, REFRESH_INTERVAL_MS);
        return () => clearInterval(id);
    }, [load]);

    const status = STATUS_STYLE[data?.status] || STATUS_STYLE.down;
    const server = data?.server;
    const db = data?.database;
    const traffic = data?.traffic;
    const payments = data?.payments;
    const heapPercent = server ? (server.memory.heap_used / server.memory.heap_total) * 100 : 0;
    const sysUsedPercent = server
        ? ((server.memory.system_total - server.memory.system_free) / server.memory.system_total) * 100
        : 0;
    const totalPayments7d = (payments?.status_7d || []).reduce((sum, r) => sum + r.total, 0);
    const requestTotals = traffic?.totals;

    return (
        <div className="min-h-screen bg-[#F8F1E7]">
            <div className="mx-auto max-w-7xl px-6 py-6">
                {/* Header */}
                <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-[#3A0810] via-[#5B0F18] to-[#7A1F2B] p-8 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <Link
                            href="/superadmin/dashboard"
                            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#F3D9A4] hover:underline"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Kembali ke dashboard
                        </Link>
                        <h1 className="text-2xl font-bold sm:text-3xl">System Console</h1>
                        <p className="mt-2 max-w-md text-sm text-white/70">
                            Kondisi server, database, lalu lintas API, pembayaran, dan job terjadwal — diukur langsung
                            dari backend.
                        </p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                        {data && (
                            <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${status.classes}`}
                            >
                                <span className={`h-2 w-2 rounded-full ${status.dot} ${data.status === "operational" ? "animate-pulse" : ""}`} />
                                {status.label}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => load({ silent: true })}
                            disabled={refreshing || loading}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#5B0F18] transition hover:bg-[#F3D9A4] disabled:opacity-60"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                            Muat ulang
                        </button>
                        {data && (
                            <p className="text-[11px] text-white/60">
                                Diperbarui {formatDateTime(data.generated_at)} • otomatis tiap{" "}
                                {REFRESH_INTERVAL_MS / 1000} detik
                            </p>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 flex items-start gap-2 rounded-2xl border border-[#F3D9A4] bg-[#FDF3D8] px-4 py-3 text-sm text-[#B4841F]">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {loading && !data && (
                    <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#8C7777]">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Memuat status sistem...
                    </div>
                )}

                {data && (
                    <>
                        {/* Masalah aktif */}
                        {data.issues.length > 0 ? (
                            <div className="mb-6 rounded-2xl border border-[#F3D9A4] bg-[#FDF3D8] p-4">
                                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-[#B4841F]">
                                    <AlertTriangle className="h-4 w-4" />
                                    {data.issues.length} hal perlu dicek
                                </p>
                                <ul className="space-y-1 text-xs text-[#7A5A12]">
                                    {data.issues.map((issue) => (
                                        <li key={issue}>• {issue}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="mb-6 flex items-center gap-2 rounded-2xl bg-[#E4F3EA] px-4 py-3 text-sm font-semibold text-[#1E7A4C]">
                                <CheckCircle2 className="h-4 w-4" />
                                Tidak ada masalah terdeteksi.
                            </div>
                        )}

                        {/* Ringkasan */}
                        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                            <StatCard
                                label="Uptime"
                                value={formatUptime(server.uptime_seconds)}
                                note={`Sejak ${formatDateTime(server.started_at)}`}
                                icon={Timer}
                                accent="border-t-4 border-t-[#5B0F18]"
                            />
                            <StatCard
                                label="Latensi Database"
                                value={db.connected ? `${db.latency_ms} ms` : "Terputus"}
                                note={db.version ? `Versi ${db.version}` : "Tidak dapat dihubungi"}
                                icon={Database}
                            />
                            <StatCard
                                label="Request API"
                                value={formatNumber(requestTotals.total)}
                                note={`${formatNumber(traffic.requests_last_5m)} dalam 5 menit terakhir`}
                                icon={Activity}
                            />
                            <StatCard
                                label="Waktu Respons"
                                value={`${traffic.avg_ms} ms`}
                                note={`p95 ${traffic.p95_ms} ms • dari ${formatNumber(traffic.sample_size)} request terakhir`}
                                icon={Clock}
                            />
                        </div>

                        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Server */}
                            <Card icon={Server} title="Server" subtitle="Proses Node.js yang sedang berjalan.">
                                <div className="space-y-2">
                                    <Row label="Node.js" value={server.node_version} />
                                    <Row label="Platform" value={server.platform} />
                                    <Row label="Environment" value={server.environment} />
                                    <Row label="Process ID" value={server.pid} />
                                    <Row label="CPU" value={`${server.cpu_cores} core`} />
                                    <Row
                                        label="Load average (1 / 5 / 15 menit)"
                                        value={`${server.load_average.m1} / ${server.load_average.m5} / ${server.load_average.m15}`}
                                    />
                                </div>
                                <div className="mt-4 space-y-3">
                                    <div>
                                        <div className="mb-1 flex justify-between text-xs">
                                            <span className="font-semibold text-[#1E1E1E]">Heap proses</span>
                                            <span className="text-[#8C7777]">
                                                {formatBytes(server.memory.heap_used)} / {formatBytes(server.memory.heap_total)}
                                            </span>
                                        </div>
                                        <Bar percent={heapPercent} />
                                    </div>
                                    <div>
                                        <div className="mb-1 flex justify-between text-xs">
                                            <span className="font-semibold text-[#1E1E1E]">Memori host</span>
                                            <span className="text-[#8C7777]">
                                                {formatBytes(server.memory.system_total - server.memory.system_free)} /{" "}
                                                {formatBytes(server.memory.system_total)}
                                            </span>
                                        </div>
                                        <Bar percent={sysUsedPercent} tone={sysUsedPercent > 85 ? "bg-[#B3261E]" : "bg-[#B4841F]"} />
                                    </div>
                                    <p className="text-[11px] text-[#8C7777]">
                                        RSS proses: {formatBytes(server.memory.rss)}
                                    </p>
                                </div>
                            </Card>

                            {/* Database */}
                            <Card icon={Database} title="Database" subtitle="Jumlah baris pada tabel utama.">
                                <div className="mb-4 grid grid-cols-2 gap-2">
                                    <Row label="Status" value={db.connected ? "Terhubung" : "Terputus"} />
                                    <Row label="Latensi" value={`${db.latency_ms} ms`} />
                                </div>
                                {db.tables.length === 0 ? (
                                    <Empty>Data tabel tidak tersedia.</Empty>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {db.tables.map((t) => (
                                            <div key={t.table} className="rounded-xl bg-[#F8F1E7] p-3">
                                                <p className="truncate text-[11px] text-[#8C7777]">{t.table}</p>
                                                <p className="text-lg font-bold text-[#5B0F18]">{formatNumber(t.rows)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Traffic */}
                        <Card
                            icon={Activity}
                            title="Lalu Lintas API"
                            subtitle={`Dihitung sejak proses mulai (${formatDateTime(traffic.since)}); reset saat server restart atau deploy.`}
                            className="mb-6"
                        >
                            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                                {[
                                    { label: "2xx Sukses", value: requestTotals.success_2xx, tone: "text-[#1E7A4C]" },
                                    { label: "3xx Redirect", value: requestTotals.redirect_3xx, tone: "text-[#5B0F18]" },
                                    { label: "4xx Error klien", value: requestTotals.client_error_4xx, tone: "text-[#B4841F]" },
                                    { label: "5xx Error server", value: requestTotals.server_error_5xx, tone: "text-[#B3261E]" },
                                ].map((c) => (
                                    <div key={c.label} className="rounded-xl bg-[#F8F1E7] p-3">
                                        <p className="text-[11px] text-[#8C7777]">{c.label}</p>
                                        <p className={`text-xl font-bold ${c.tone}`}>{formatNumber(c.value)}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                <div>
                                    <h3 className="mb-2 text-sm font-bold text-[#1E1E1E]">Endpoint paling lambat</h3>
                                    {traffic.slowest_routes.length === 0 ? (
                                        <Empty>Belum ada request tercatat.</Empty>
                                    ) : (
                                        <div className="space-y-2">
                                            {traffic.slowest_routes.map((r) => (
                                                <div key={r.route} className="rounded-xl bg-[#F8F1E7] p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="truncate font-mono text-xs font-semibold text-[#1E1E1E]">
                                                            {r.route}
                                                        </p>
                                                        <p className="shrink-0 text-xs font-bold text-[#5B0F18]">
                                                            {r.avg_ms} ms
                                                        </p>
                                                    </div>
                                                    <p className="mt-0.5 text-[11px] text-[#8C7777]">
                                                        {formatNumber(r.count)} request • terlama {r.max_ms} ms
                                                        {r.errors > 0 ? ` • ${r.errors} error 5xx` : ""}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h3 className="mb-2 text-sm font-bold text-[#1E1E1E]">Error server terbaru</h3>
                                    {traffic.recent_errors.length === 0 ? (
                                        <Empty>Tidak ada error 5xx sejak proses dimulai.</Empty>
                                    ) : (
                                        <div className="space-y-2">
                                            {traffic.recent_errors.map((e, i) => (
                                                <div key={`${e.t}-${i}`} className="rounded-xl bg-[#F3E4E4] p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="truncate font-mono text-xs font-semibold text-[#B3261E]">
                                                            {e.status} {e.path}
                                                        </p>
                                                        <p className="shrink-0 text-[11px] text-[#8C7777]">{timeAgo(e.t)}</p>
                                                    </div>
                                                    <p className="mt-0.5 truncate text-[11px] text-[#8C7777]">{e.message}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>

                        <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Pembayaran */}
                            <Card
                                icon={CreditCard}
                                title="Pembayaran"
                                subtitle={`Midtrans • mode ${payments.mode}`}
                            >
                                <div className="mb-4 space-y-2">
                                    <Row
                                        label="Pembayaran berhasil terakhir"
                                        value={
                                            payments.last_settlement_at
                                                ? `${formatDateTime(payments.last_settlement_at)} (${timeAgo(payments.last_settlement_at)})`
                                                : "Belum ada"
                                        }
                                    />
                                    <Row
                                        label="Pending lewat batas bayar"
                                        value={
                                            <span className={payments.stuck_pending > 0 ? "text-[#B3261E]" : "text-[#1E7A4C]"}>
                                                {formatNumber(payments.stuck_pending)} pesanan
                                            </span>
                                        }
                                    />
                                </div>

                                <h3 className="mb-2 text-sm font-bold text-[#1E1E1E]">Status pembayaran, 7 hari terakhir</h3>
                                {payments.status_7d.length === 0 ? (
                                    <Empty>Belum ada pembayaran dalam 7 hari terakhir.</Empty>
                                ) : (
                                    <div className="space-y-2">
                                        {payments.status_7d.map((s) => {
                                            const pct = totalPayments7d ? (s.total / totalPayments7d) * 100 : 0;
                                            return (
                                                <div key={s.status}>
                                                    <div className="mb-1 flex justify-between text-xs">
                                                        <span className="font-semibold text-[#1E1E1E]">
                                                            {PAYMENT_STATUS_LABEL[s.status] || s.status}
                                                        </span>
                                                        <span className="text-[#8C7777]">
                                                            {formatNumber(s.total)} • {pct.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <Bar
                                                        percent={pct}
                                                        tone={
                                                            s.status === "settlement" || s.status === "capture"
                                                                ? "bg-[#1E7A4C]"
                                                                : s.status === "pending"
                                                                  ? "bg-[#B4841F]"
                                                                  : "bg-[#B3261E]"
                                                        }
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {payments.methods.length > 0 && (
                                    <>
                                        <h3 className="mb-2 mt-5 text-sm font-bold text-[#1E1E1E]">Metode yang dipakai</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {payments.methods.map((m) => (
                                                <span
                                                    key={m.type}
                                                    className="rounded-full bg-[#F8F1E7] px-3 py-1 text-xs font-semibold text-[#5B0F18]"
                                                >
                                                    {m.type} • {formatNumber(m.total)}
                                                </span>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </Card>

                            <div className="space-y-6">
                                {/* Scheduler */}
                                <Card icon={Cpu} title="Job Terjadwal" subtitle="Cron job yang berjalan di server.">
                                    {data.scheduler.length === 0 ? (
                                        <Empty>Tidak ada job terdaftar.</Empty>
                                    ) : (
                                        data.scheduler.map((job) => (
                                            <div key={job.name} className="space-y-2">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-bold text-[#1E1E1E]">{job.name}</p>
                                                    <span
                                                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                                            job.last_error
                                                                ? "bg-[#F3E4E4] text-[#B3261E]"
                                                                : job.runs === 0
                                                                  ? "bg-[#F0EDED] text-[#8C7777]"
                                                                  : "bg-[#E4F3EA] text-[#1E7A4C]"
                                                        }`}
                                                    >
                                                        {job.last_error ? "GAGAL" : job.runs === 0 ? "BELUM JALAN" : "SEHAT"}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#8C7777]">{job.description}</p>
                                                <Row label="Jadwal (cron)" value={<span className="font-mono">{job.schedule}</span>} />
                                                <Row label="Eksekusi terakhir" value={`${timeAgo(job.last_run_at)}${job.last_duration_ms != null ? ` • ${job.last_duration_ms} ms` : ""}`} />
                                                <Row label="Total eksekusi" value={formatNumber(job.runs)} />
                                                <Row label="Event dipublikasikan" value={`${formatNumber(job.total_published)} total • ${formatNumber(job.last_published)} terakhir`} />
                                                {job.last_error && (
                                                    <div className="rounded-xl bg-[#F3E4E4] p-3 text-xs text-[#B3261E]">
                                                        <p className="font-semibold">Error terakhir ({timeAgo(job.last_error_at)})</p>
                                                        <p className="mt-0.5 break-words">{job.last_error}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </Card>

                                {/* Integrasi */}
                                <Card icon={Plug} title="Integrasi & Konfigurasi" subtitle="Hanya status terisi atau belum; nilai kunci tidak pernah dikirim.">
                                    <div className="space-y-2">
                                        {data.integrations.map((i) => (
                                            <div
                                                key={i.name}
                                                className="flex items-center justify-between gap-3 rounded-xl bg-[#F8F1E7] px-3 py-2"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-[#1E1E1E]">{i.name}</p>
                                                    <p className="truncate text-[11px] text-[#8C7777]">{i.detail}</p>
                                                </div>
                                                {i.configured ? (
                                                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#1E7A4C]">
                                                        <CheckCircle2 className="h-3.5 w-3.5" /> Terkonfigurasi
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#B3261E]">
                                                        <XCircle className="h-3.5 w-3.5" /> Belum lengkap
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}