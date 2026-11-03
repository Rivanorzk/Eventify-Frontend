"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import {
    AlertTriangle,
    ArrowLeft,
    Camera,
    CameraOff,
    CheckCircle2,
    Keyboard,
    QrCode,
    RefreshCw,
    Ticket,
    XCircle,
} from "lucide-react";

import { redeemTicket, getRedemptions } from "@/services/redemptionService";

const SCANNER_ELEMENT_ID = "gate-qr-reader";

// Supaya QR yang sama tidak diproses berkali-kali selama masih
// terlihat di depan kamera (html5-qrcode akan terus memanggil callback
// setiap frame selama kode masih terbaca).
const RESCAN_COOLDOWN_MS = 4000;

function formatTime(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Matikan kamera dengan aman. Html5Qrcode.stop() melempar error (bukan
// promise reject) kalau scanner sedang tidak berjalan, misalnya kamera sudah
// ditutup lewat tombol OK lalu halaman ditinggalkan. Karena itu status dicek
// dulu dan semuanya dibungkus try/catch.
const SCANNING = 2;
const PAUSED = 3;

async function safeStopScanner(scanner) {
    if (!scanner) return;

    try {
        const state = scanner.getState();
        if (state === SCANNING || state === PAUSED) {
            await scanner.stop();
        }
    } catch {
        // sudah berhenti / gagal berhenti, tidak ada yang perlu dilakukan
    }

    try {
        scanner.clear();
    } catch {
        // sudah bersih
    }
}

// ---------------------------------------------------------------------
// Popup hasil scan
// ---------------------------------------------------------------------

function ScanResultModal({ result, onClose }) {
    // Escape sama dengan menekan OK, supaya alurnya konsisten.
    useEffect(() => {
        if (!result) return;
        const onKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [result, onClose]);

    if (!result) return null;

    const { ok, message, detail } = result;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scan-result-title"
        >
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
                <div
                    className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                        ok ? "bg-[#E4F3EA] text-[#1E7A4C]" : "bg-[#F3E4E4] text-[#B3261E]"
                    }`}
                >
                    {ok ? (
                        <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
                    ) : (
                        <XCircle className="h-9 w-9" aria-hidden="true" />
                    )}
                </div>

                <h3
                    id="scan-result-title"
                    className={`mt-4 text-lg font-bold ${
                        ok ? "text-[#1E7A4C]" : "text-[#B3261E]"
                    }`}
                >
                    {ok ? "Tiket berhasil di-scan" : "Tiket gagal di-scan"}
                </h3>

                <p className="mt-1 text-sm text-[#5F5551]">{message}</p>

                {detail?.ticket_code && (
                    <p className="mt-3 break-all rounded-lg bg-[#F8F1E7] px-3 py-2 font-mono text-xs text-[#5F5551]">
                        {detail.ticket_code}
                    </p>
                )}

                {ok && (
                    <div className="mt-3 space-y-1 text-left text-xs text-[#5F5551]">
                        {detail?.event_title && <p>Event: {detail.event_title}</p>}
                        {detail?.category_name && <p>Kategori: {detail.category_name}</p>}
                        {detail?.customer_name && <p>Customer: {detail.customer_name}</p>}
                    </div>
                )}

                <button
                    type="button"
                    onClick={onClose}
                    autoFocus
                    className="mt-6 w-full rounded-xl bg-[#5B0F18] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#7A1F2B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7A1F2B] focus-visible:ring-offset-2"
                >
                    OK
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------
// Halaman
// ---------------------------------------------------------------------

export default function GateScannerPage() {
    const router = useRouter();

    const scannerRef = useRef(null); // instance Html5Qrcode
    const isProcessingRef = useRef(false);
    const lastCodeRef = useRef({ code: null, at: 0 });

    const [cameras, setCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [cameraError, setCameraError] = useState(null);

    const [lastResult, setLastResult] = useState(null); // { ok, message, detail }
    const [resultModal, setResultModal] = useState(null); // popup hasil scan
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const [manualMode, setManualMode] = useState(false);
    const [manualCode, setManualCode] = useState("");
    const [manualSubmitting, setManualSubmitting] = useState(false);

    // ---- Auth guard, sama seperti halaman dashboard ----
    useEffect(() => {
        const token = Cookies.get("token");
        if (!token) {
            router.replace("/login");
        }
    }, [router]);

    const loadHistory = useCallback(async () => {
        try {
            setLoadingHistory(true);
            const rows = await getRedemptions();
            setHistory(rows || []);
        } catch {
            // riwayat gagal dimuat bukan hal fatal, biarkan scanner tetap jalan
        } finally {
            setLoadingHistory(false);
        }
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    // ---- Proses hasil scan (dipakai baik dari kamera maupun input manual) ----
    const processCode = useCallback(
        async (rawCode, source = "manual") => {
            const code = String(rawCode || "").trim();
            if (!code) return;

            const now = Date.now();
            if (
                lastCodeRef.current.code === code &&
                now - lastCodeRef.current.at < RESCAN_COOLDOWN_MS
            ) {
                return; // masih dalam cooldown, kode yang sama, abaikan
            }

            // Selama popup terbuka (atau request masih berjalan) scan lain diabaikan.
            if (isProcessingRef.current) return;
            isProcessingRef.current = true;
            lastCodeRef.current = { code, at: now };

            // Bekukan kamera segera setelah QR terbaca supaya tidak ada scan ganda.
            if (source === "camera" && scannerRef.current) {
                try {
                    scannerRef.current.pause(true);
                } catch {
                    // kamera mungkin sudah berhenti, aman diabaikan
                }
            }

            let result;

            try {
                const data = await redeemTicket(code);
                result = {
                    ok: true,
                    message: "Tiket valid, check-in berhasil",
                    detail: data,
                };
                loadHistory();
            } catch (err) {
                result = {
                    ok: false,
                    message:
                        err?.response?.data?.message ||
                        err?.message ||
                        "Gagal memvalidasi tiket",
                    detail: { ticket_code: code },
                };
            }

            setLastResult(result);
            setResultModal(result);
            // isProcessingRef sengaja tetap true; baru dilepas saat popup ditutup.
        },
        [loadHistory]
    );

    // ---- Setup daftar kamera yang tersedia di laptop ----
    useEffect(() => {
        let cancelled = false;

        import("html5-qrcode").then(({ Html5Qrcode }) => {
            Html5Qrcode.getCameras()
                .then((devices) => {
                    if (cancelled) return;
                    setCameras(devices || []);
                    if (devices && devices.length > 0) {
                        setSelectedCameraId(devices[0].id);
                    }
                })
                .catch(() => {
                    if (!cancelled) {
                        setCameraError(
                            "Tidak bisa mengakses daftar kamera. Pastikan browser mendapat izin kamera."
                        );
                    }
                });
        });

        return () => {
            cancelled = true;
        };
    }, []);

    // ---- Start / stop kamera ----
    const startScanning = useCallback(async () => {
        if (!selectedCameraId || isScanning) return;
        setCameraError(null);

        try {
            const { Html5Qrcode } = await import("html5-qrcode");

            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID);
            }

            await scannerRef.current.start(
                selectedCameraId,
                {
                    fps: 10,
                    qrbox: { width: 260, height: 260 },
                    aspectRatio: 1.0,
                },
                (decodedText) => {
                    processCode(decodedText, "camera");
                },
                () => {
                    // decode error per-frame, wajar terjadi terus-menerus
                    // saat tidak ada QR di kamera — sengaja diabaikan.
                }
            );

            setIsScanning(true);
        } catch (err) {
            setCameraError(
                err?.message || "Gagal membuka kamera. Cek izin kamera di browser."
            );
            setIsScanning(false);
        }
    }, [selectedCameraId, isScanning, processCode]);

    const stopScanning = useCallback(async () => {
        await safeStopScanner(scannerRef.current);
        setIsScanning(false);
    }, []);

    // Tombol OK di popup: tutup popup lalu matikan kamera otomatis.
    const closeResultModal = useCallback(async () => {
        setResultModal(null);
        isProcessingRef.current = false;
        await stopScanning();
    }, [stopScanning]);

    // Cleanup saat pindah halaman: pastikan kamera benar-benar dilepas
    // tanpa melempar error kalau scanner sudah berhenti.
    useEffect(() => {
        return () => {
            safeStopScanner(scannerRef.current);
        };
    }, []);

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!manualCode.trim()) return;
        setManualSubmitting(true);
        await processCode(manualCode.trim(), "manual");
        setManualCode("");
        setManualSubmitting(false);
    };

    return (
        <div className="min-h-screen bg-[#F8F1E7]">
            <ScanResultModal result={resultModal} onClose={closeResultModal} />

            <div className="mx-auto max-w-6xl px-6 py-6">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <Link
                            href="/admin/dashboard"
                            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[#8C7777] hover:text-[#5B0F18]"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Kembali ke Dashboard
                        </Link>
                        <h1 className="flex items-center gap-2 text-2xl font-bold text-[#1E1E1E] sm:text-3xl">
                            <QrCode className="h-7 w-7 text-[#5B0F18]" />
                            Gate Scanner
                        </h1>
                        <p className="mt-1 text-sm text-[#8C7777]">
                            Arahkan kamera laptop ke QR code tiket yang ditunjukkan
                            customer dari smartphone-nya.
                        </p>
                    </div>

                    <button
                        onClick={() => setManualMode((v) => !v)}
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#5B0F18] shadow-sm transition hover:bg-[#F3E9DD]"
                    >
                        <Keyboard className="h-4 w-4" />
                        {manualMode ? "Sembunyikan Input Manual" : "Input Manual"}
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Kamera + hasil scan */}
                    <div className="lg:col-span-2">
                        <div className="rounded-2xl bg-white p-5 shadow-sm">
                            {/* Pilih kamera */}
                            {cameras.length > 1 && (
                                <div className="mb-3">
                                    <label className="mb-1 block text-xs font-semibold text-[#8C7777]">
                                        Pilih Kamera
                                    </label>
                                    <select
                                        value={selectedCameraId || ""}
                                        onChange={(e) => setSelectedCameraId(e.target.value)}
                                        disabled={isScanning}
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#1E1E1E] outline-none disabled:opacity-60"
                                    >
                                        {cameras.map((cam) => (
                                            <option key={cam.id} value={cam.id}>
                                                {cam.label || `Kamera ${cam.id}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Viewport kamera */}
                            <div className="relative overflow-hidden rounded-2xl bg-[#1E1E1E]">
                                {/* Preview dibuat mirror seperti kamera depan (selfie). Hanya
                                    tampilan; pembacaan QR memakai frame asli. */}
                                <style>{`#${SCANNER_ELEMENT_ID} video { transform: scaleX(-1) !important; }`}</style>
                                <div id={SCANNER_ELEMENT_ID} className="mx-auto w-full" />

                                {!isScanning && (
                                    <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 text-white/70">
                                        <Camera className="h-10 w-10" />
                                        <p className="px-6 text-center text-sm">
                                            Kamera belum aktif. Klik &quot;Mulai Scan&quot; untuk
                                            membuka kamera laptop.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {cameraError && (
                                <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#F3E4E4] p-3 text-xs text-[#B3261E]">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    {cameraError}
                                </div>
                            )}

                            <div className="mt-4 flex gap-2">
                                {!isScanning ? (
                                    <button
                                        onClick={startScanning}
                                        disabled={!selectedCameraId}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#5B0F18] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#7A1F2B] disabled:opacity-50"
                                    >
                                        <Camera className="h-4 w-4" />
                                        Mulai Scan
                                    </button>
                                ) : (
                                    <button
                                        onClick={stopScanning}
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#F0EDED] px-4 py-3 text-sm font-bold text-[#5B0F18] transition hover:bg-[#e5e0e0]"
                                    >
                                        <CameraOff className="h-4 w-4" />
                                        Hentikan Kamera
                                    </button>
                                )}
                            </div>

                            {/* Input manual, fallback kalau kamera bermasalah */}
                            {manualMode && (
                                <form onSubmit={handleManualSubmit} className="mt-4 flex gap-2">
                                    <input
                                        type="text"
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                        placeholder="Ketik kode tiket secara manual..."
                                        className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={manualSubmitting || !manualCode.trim()}
                                        className="rounded-xl bg-[#5B0F18] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#7A1F2B] disabled:opacity-50"
                                    >
                                        Cek
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Hasil scan terakhir */}
                        {lastResult && (
                            <div
                                className={`mt-4 rounded-2xl p-5 shadow-sm ${
                                    lastResult.ok
                                        ? "bg-[#E4F3EA] text-[#1E7A4C]"
                                        : "bg-[#F3E4E4] text-[#B3261E]"
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    {lastResult.ok ? (
                                        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
                                    ) : (
                                        <XCircle className="mt-0.5 h-6 w-6 shrink-0" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold">{lastResult.message}</p>
                                        <p className="mt-0.5 font-mono text-xs opacity-80">
                                            {lastResult.detail?.ticket_code}
                                        </p>

                                        {lastResult.ok && (
                                            <div className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                                                {lastResult.detail?.event_title && (
                                                    <span>Event: {lastResult.detail.event_title}</span>
                                                )}
                                                {lastResult.detail?.category_name && (
                                                    <span>Kategori: {lastResult.detail.category_name}</span>
                                                )}
                                                {lastResult.detail?.customer_name && (
                                                    <span>Customer: {lastResult.detail.customer_name}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Riwayat check-in */}
                    <div className="rounded-2xl bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="flex items-center gap-2 text-sm font-bold text-[#1E1E1E]">
                                <Ticket className="h-4 w-4 text-[#5B0F18]" />
                                Riwayat Scan Terbaru
                            </h2>
                            <button
                                onClick={loadHistory}
                                className="rounded-full p-1.5 text-[#8C7777] hover:bg-[#F8F1E7]"
                                title="Muat ulang"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            {loadingHistory &&
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="h-16 animate-pulse rounded-xl bg-[#F8F1E7]" />
                                ))}

                            {!loadingHistory && history.length === 0 && (
                                <div className="rounded-xl bg-[#F8F1E7] p-4 text-center text-xs text-[#8C7777]">
                                    Belum ada tiket yang di-check-in.
                                </div>
                            )}

                            {!loadingHistory &&
                                history.slice(0, 10).map((item) => (
                                    <div key={item.id} className="rounded-xl bg-[#F8F1E7] p-3">
                                        <div className="flex items-center justify-between">
                                            <p className="truncate text-xs font-bold text-[#1E1E1E]">
                                                {item.event_title || item.ticket_code}
                                            </p>
                                            <span className="shrink-0 text-[10px] text-[#8C7777]">
                                                {formatTime(item.redeemed_at)}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 truncate text-[11px] text-[#8C7777]">
                                            {item.customer_name}
                                            {item.category_name ? ` • ${item.category_name}` : ""}
                                        </p>
                                        <p className="mt-0.5 font-mono text-[10px] text-[#8C7777]">
                                            {item.ticket_code}
                                        </p>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}