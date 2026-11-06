// components/avatarCropModal.jsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper from "react-easy-crop";
import { X, ZoomIn, RotateCw, Crop } from "lucide-react";
import getCroppedImg from "@/lib/cropImage";
import { toast } from "react-hot-toast";

export default function AvatarCropModal({ isOpen, imageSrc, onClose, onCropComplete }) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [processing, setProcessing] = useState(false);

    // Reset state tiap kali gambar baru dipilih
    useEffect(() => {
        if (imageSrc) {
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
            setCroppedAreaPixels(null);
        }
    }, [imageSrc]);

    const onCropCompleteInternal = useCallback((_area, areaPixels) => {
        setCroppedAreaPixels(areaPixels);
    }, []);

    const handleConfirm = async () => {
        if (!croppedAreaPixels) {
            toast.error("Area crop belum siap, coba geser/zoom sedikit.");
            return;
        }
        try {
            setProcessing(true);
            const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
            await onCropComplete(blob);
            onClose();
        } catch (e) {
            console.error("Crop error:", e);
            toast.error("Gagal memproses gambar.");
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen || !imageSrc) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#E5D6D0] px-5 py-4">
                    <div className="flex items-center gap-2">
                        <Crop className="h-5 w-5 text-[#5B0F18]" />
                        <h3 className="text-base font-bold text-[#1E1E1E]">Sesuaikan Foto Profil</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="rounded-lg p-1.5 text-[#8C7777] transition-colors hover:bg-[#F8F1E7] hover:text-[#5B0F18] disabled:opacity-50"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Crop area */}
                <div className="relative h-80 w-full bg-[#1E1E1E]">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        onCropComplete={onCropCompleteInternal}
                    />
                </div>

                {/* Controls */}
                <div className="space-y-4 px-5 py-5">
                    <div>
                        <div className="mb-1.5 flex items-center justify-between">
                            <label className="flex items-center gap-1.5 text-xs font-bold text-[#8C7777]">
                                <ZoomIn size={14} /> Zoom
                            </label>
                            <span className="text-[11px] font-semibold text-[#5B0F18]">
                                {Math.round(zoom * 100)}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="w-full accent-[#5B0F18]"
                        />
                    </div>

                    <div>
                        <div className="mb-1.5 flex items-center justify-between">
                            <label className="flex items-center gap-1.5 text-xs font-bold text-[#8C7777]">
                                <RotateCw size={14} /> Rotasi
                            </label>
                            <span className="text-[11px] font-semibold text-[#5B0F18]">
                                {rotation}°
                            </span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={360}
                            step={1}
                            value={rotation}
                            onChange={(e) => setRotation(parseFloat(e.target.value))}
                            className="w-full accent-[#5B0F18]"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 border-t border-[#E5D6D0] bg-[#FAFAF9] px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="h-10 rounded-xl border border-[#E5D6D0] bg-white px-4 text-xs font-bold text-[#5B0F18] transition-colors hover:bg-[#F8F1E7] disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={processing}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#5B0F18] px-5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#7A1F2B] disabled:opacity-60"
                    >
                        {processing ? (
                            <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Memproses...
                            </>
                        ) : (
                            "Simpan Foto"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}