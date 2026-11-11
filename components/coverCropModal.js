// components/coverCropModal.js
// Mengatur posisi & zoom gambar banner (cover) sebelum diunggah.
// Tanpa library tambahan: geser dengan drag, zoom dengan slider,
// hasilnya di-render ke canvas 3:1 (1500x500) lalu dikirim sebagai Blob.
"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Move, X, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "react-hot-toast";

const ASPECT = 3; // lebar : tinggi
const OUT_W = 1500;
const OUT_H = OUT_W / ASPECT;
const MAX_ZOOM = 3;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function CoverCropModal({
    isOpen,
    imageSrc,
    onClose,
    onCropComplete, // async (blob) => void ; penutupan modal diatur oleh parent
    saving = false,
}) {
    const frameRef = useRef(null);
    const imgRef = useRef(null);
    const dragRef = useRef(null);

    const [natural, setNatural] = useState(null);
    const [frame, setFrame] = useState({ w: 0, h: 0 });
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [loadError, setLoadError] = useState(false);

    // Muat gambar & reset posisi setiap kali modal dibuka dengan gambar baru
    useEffect(() => {
        if (!isOpen || !imageSrc) return;

        setNatural(null);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setLoadError(false);

        const img = new Image();
        // Gambar dari URL (cover yang sudah ada) butuh CORS agar canvas boleh diekspor
        if (!imageSrc.startsWith("data:")) img.crossOrigin = "anonymous";
        img.onload = () => {
            imgRef.current = img;
            setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        };
        img.onerror = () => setLoadError(true);
        img.src = imageSrc;
    }, [isOpen, imageSrc]);

    // Ukur bingkai (responsif)
    useEffect(() => {
        if (!isOpen) return;
        const el = frameRef.current;
        if (!el) return;

        const update = () => setFrame({ w: el.clientWidth, h: el.clientHeight });
        update();

        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, [isOpen]);

    if (!isOpen) return null;

    // ---------- Geometri ----------
    const ready = Boolean(natural && frame.w && frame.h);
    const baseScale = ready ? Math.max(frame.w / natural.w, frame.h / natural.h) : 1;

    const boundsFor = (z) => {
        if (!ready) return { maxX: 0, maxY: 0 };
        const dispW = natural.w * baseScale * z;
        const dispH = natural.h * baseScale * z;
        return {
            maxX: Math.max(0, (dispW - frame.w) / 2),
            maxY: Math.max(0, (dispH - frame.h) / 2),
        };
    };

    const clampOffset = (o, z) => {
        const { maxX, maxY } = boundsFor(z);
        return { x: clamp(o.x, -maxX, maxX), y: clamp(o.y, -maxY, maxY) };
    };

    const scale = baseScale * zoom;
    const dispW = ready ? natural.w * scale : 0;
    const dispH = ready ? natural.h * scale : 0;
    const pos = clampOffset(offset, zoom);

    // ---------- Interaksi ----------
    const handlePointerDown = (e) => {
        if (!ready || saving) return;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        dragRef.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
    };

    const handlePointerMove = (e) => {
        const d = dragRef.current;
        if (!d) return;
        setOffset(
            clampOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }, zoom)
        );
    };

    const handlePointerUp = () => {
        dragRef.current = null;
    };

    const handleZoom = (value) => {
        const z = clamp(Number(value), 1, MAX_ZOOM);
        setZoom(z);
        setOffset((prev) => clampOffset(prev, z));
    };

    // ---------- Simpan ----------
    const handleSave = () => {
        const img = imgRef.current;
        if (!ready || !img || saving) return;

        try {
            const canvas = document.createElement("canvas");
            canvas.width = OUT_W;
            canvas.height = OUT_H;
            const ctx = canvas.getContext("2d");

            const left = frame.w / 2 - dispW / 2 + pos.x;
            const top = frame.h / 2 - dispH / 2 + pos.y;

            ctx.fillStyle = "#F8F1E7";
            ctx.fillRect(0, 0, OUT_W, OUT_H);
            ctx.drawImage(
                img,
                -left / scale,
                -top / scale,
                frame.w / scale,
                frame.h / scale,
                0,
                0,
                OUT_W,
                OUT_H
            );

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        toast.error("Gagal memproses gambar");
                        return;
                    }
                    onCropComplete(blob);
                },
                "image/jpeg",
                0.9
            );
        } catch (err) {
            console.error("Cover crop error:", err);
            toast.error("Gambar tidak bisa diproses. Coba unggah ulang gambarnya.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-[#1E1E1E]">Atur Gambar Cover</h2>
                        <p className="mt-0.5 text-sm text-[#737373]">
                            Geser gambar untuk mengatur posisi, lalu atur zoom sesuai kebutuhan.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-lg p-1.5 transition hover:bg-[#F8F1E7] disabled:opacity-50"
                        aria-label="Tutup"
                    >
                        <X className="h-5 w-5 text-[#737373]" />
                    </button>
                </div>

                {/* Bingkai: rasio sama dengan hasil akhir */}
                <div
                    ref={frameRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className={`relative w-full select-none overflow-hidden rounded-xl bg-[#F8F1E7] ${
                        ready ? "cursor-grab active:cursor-grabbing" : ""
                    }`}
                    style={{ aspectRatio: `${ASPECT} / 1`, touchAction: "none" }}
                >
                    {ready && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={imageSrc}
                            alt="Pratinjau cover"
                            draggable={false}
                            className="pointer-events-none absolute left-1/2 top-1/2"
                            style={{
                                width: dispW,
                                height: dispH,
                                maxWidth: "none",
                                transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
                            }}
                        />
                    )}

                    {!ready && !loadError && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-[#5B0F18]" />
                        </div>
                    )}

                    {loadError && (
                        <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-[#B3261E]">
                            Gambar tidak bisa dimuat untuk diatur. Gunakan &quot;Ubah Cover&quot; untuk
                            memilih gambar dari perangkat.
                        </div>
                    )}

                    {ready && (
                        <span className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white">
                            <Move className="h-3 w-3" />
                            Geser untuk memposisikan
                        </span>
                    )}
                </div>

                {/* Zoom */}
                <div className="mt-4 flex items-center gap-3">
                    <ZoomOut className="h-4 w-4 shrink-0 text-[#737373]" />
                    <input
                        type="range"
                        min={1}
                        max={MAX_ZOOM}
                        step={0.01}
                        value={zoom}
                        onChange={(e) => handleZoom(e.target.value)}
                        disabled={!ready || saving}
                        aria-label="Zoom"
                        className="h-2 w-full cursor-pointer accent-[#5B0F18]"
                    />
                    <ZoomIn className="h-4 w-4 shrink-0 text-[#737373]" />
                    <span className="w-12 shrink-0 text-right text-xs font-semibold text-[#5B0F18]">
                        {Math.round(zoom * 100)}%
                    </span>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-xl bg-[#F8F1E7] px-5 py-2.5 text-sm font-bold text-[#5B0F18] transition hover:bg-[#F3E9DD] disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!ready || saving}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5B0F18] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#7A1F2B] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            "Simpan Cover"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
