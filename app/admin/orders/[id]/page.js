"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Home,
  ChevronRight,
  Copy,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Printer,
  CalendarDays,
  PlayCircle,
  Crown,
  User,
  BadgeCheck,
  QrCode,
  Info,
  CheckCircle,
  Ticket,
  CircleSlash,
  MapPin,
  ExternalLink,
  Wallet,
  Headphones,
  MessageCircle,
  Music,
} from "lucide-react";
import { toast } from "react-hot-toast";

import { getOrderById } from "@/services/orderService";
import LoadingSpinner from "@/components/loadingSpinner";
import EmptyState from "@/components/emptyState";
import { currency, formatDateTime, formatDate } from "@/lib/formatter";
import BackButton from "@/components/backButton";

// ─── Konstanta ─────────────────────────────────────────────────
const SUPPORT_WA =
  process.env.NEXT_PUBLIC_SUPPORT_WA || "https://wa.me/6281234567890";

const STATUS_MAP = {
  paid: {
    label: "Lunas",
    icon: CheckCircle2,
    pillClass: "bg-[#FFDADA] text-[#40000C]",
    dot: "bg-[#A13C46]",
  },
  pending: {
    label: "Menunggu Pembayaran",
    icon: Clock,
    pillClass: "bg-[#FDF3D8] text-[#B4841F]",
    dot: "bg-[#B4841F]",
  },
  expired: {
    label: "Kedaluwarsa",
    icon: XCircle,
    pillClass: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
  cancelled: {
    label: "Dibatalkan",
    icon: AlertCircle,
    pillClass: "bg-gray-100 text-gray-700",
    dot: "bg-gray-500",
  },
};

const PAYMENT_LABELS = {
  bank_transfer: "Transfer Bank / VA",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  qris: "QRIS",
  credit_card: "Kartu Kredit",
  cstore: "Convenience Store",
  echannel: "Mandiri Bill",
};

const paymentLabel = (type) => (type ? PAYMENT_LABELS[type] || type : "-");

function bankShort(type) {
  if (!type) return "PAY";
  const t = type.toLowerCase();
  if (t.includes("bca")) return "BCA";
  if (t.includes("mandiri") || t.includes("echannel")) return "MDR";
  if (t.includes("bni")) return "BNI";
  if (t.includes("bri")) return "BRI";
  if (t.includes("gopay")) return "GO";
  if (t.includes("qris")) return "QR";
  return t.slice(0, 3).toUpperCase();
}

const toHHmm = (v) => (v ? `${String(v).slice(0, 5)} WIB` : "-");

// ─── Halaman ───────────────────────────────────────────────────
export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params?.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      setOrder(await getOrderById(orderId));
    } catch (err) {
      console.error("Load order error:", err);
      setError(err?.response?.data?.message || "Gagal memuat detail order.");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const lines = useMemo(() => order?.order_details || [], [order]);
  const allTickets = useMemo(
    () => order?.tickets || lines.flatMap((l) => l.tickets || []),
    [order, lines]
  );
  const totalQty = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0),
    [lines]
  );

  const handleCopyOrderId = async () => {
    if (!order?.invoice_number) return;
    try {
      await navigator.clipboard.writeText(order.invoice_number);
      toast.success("Nomor invoice disalin!");
    } catch {
      toast.error("Gagal menyalin");
    }
  };

  // ─── Loading / error ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-8 py-12">
        <LoadingSpinner text="Memuat detail order..." />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-7xl px-8 py-12">
        <EmptyState
          title="Order tidak ditemukan"
          description={error || "Data order tidak tersedia."}
        />
        <BackButton
          href="/admin/orders"
          label="Kembali ke Daftar Order"
          className="mt-4"
        />
      </div>
    );
  }

  const meta = STATUS_MAP[order.status] || STATUS_MAP.pending;
  const isPaid = order.status === "paid";
  const payment = order.payment;

  return (
    <div className="min-h-screen bg-[#FCF9F8]">
      <div id="order-print-area" className="mx-auto w-full max-w-7xl px-8 py-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-[#554242] print:hidden">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1 transition hover:text-[#3B0008]"
          >
            <Home size={16} />
            Dashboard
          </Link>
          <ChevronRight size={14} className="text-[#DBC0C0]" />
          <Link
            href="/admin/orders"
            className="transition hover:text-[#3B0008]"
          >
            Daftar Order
          </Link>
          <ChevronRight size={14} className="text-[#DBC0C0]" />
          <span className="font-semibold text-[#5B0F18]">
            #{order.invoice_number}
          </span>
        </nav>

        {/* Header */}
        <header className="mb-8 flex flex-col justify-between gap-6 rounded-xl bg-white p-6 shadow-sm lg:flex-row lg:items-center">
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#F6F3F2]">
              <BadgeCheck size={30} className="text-[#A13C46]" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-xl font-bold tracking-tight text-[#3B0008]">
                  Order #{order.invoice_number}
                </h1>
                <button
                  type="button"
                  onClick={handleCopyOrderId}
                  title="Salin nomor invoice"
                  className="rounded-full p-1 text-[#887271] transition hover:bg-[#F0EDED] hover:text-[#3B0008] print:hidden"
                >
                  <Copy size={18} />
                </button>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${meta.pillClass}`}
                >
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              </div>

              <p className="mt-1 flex items-center gap-2 text-sm text-[#554242]">
                <Clock size={16} />
                Waktu transaksi: {formatDateTime(order.created_at)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 rounded-full bg-[#5B0F18] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3B0008] print:hidden"
          >
            <Printer size={18} />
            Cetak / Simpan PDF
          </button>
        </header>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* ═══ KIRI ═══ */}
          <div className="space-y-8 lg:col-span-8">
            {/* Banner event */}
            <section className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="relative h-64 w-full overflow-hidden md:h-80">
                {order.event_poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={order.event_poster}
                    alt={order.event_title || "Poster event"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#5B0F18]">
                    <Music size={64} className="text-white/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#5B0F18] via-[#5B0F18]/40 to-transparent" />

                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <h2 className="text-3xl font-bold leading-tight tracking-tight">
                    {order.event_title || "Event"}
                  </h2>
                  <p className="mt-1 flex items-center gap-2 text-base text-white/90">
                    <MapPin size={18} className="shrink-0 text-[#FE848C]" />
                    {order.event_location || "-"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 bg-[#F6F3F2] p-6 sm:grid-cols-3">
                <SpecItem
                  label="Tanggal"
                  value={order.event_date ? formatDate(order.event_date) : "-"}
                  icon={CalendarDays}
                />
                <SpecItem
                  label="Mulai"
                  value={toHHmm(order.start_time)}
                  icon={PlayCircle}
                />
                <SpecItem
                  label="Kategori"
                  value={lines[0]?.category_name || "Regular"}
                  icon={Crown}
                />
              </div>
            </section>

            {/* Tiket */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="h-6 w-2.5 rounded-full bg-[#5B0F18]" />
                  <h2 className="text-xl font-bold text-[#1B1B1C]">
                    {isPaid ? "Tiket Digital" : "Tiket"}
                  </h2>
                  <span className="rounded-full bg-[#FFDADA] px-2.5 py-0.5 text-xs font-bold text-[#40000C]">
                    {allTickets.length || totalQty} Tiket
                  </span>
                </div>
              </div>

              {!isPaid && (
                <div className="rounded-xl border border-dashed border-[#DBC0C0] bg-white p-6 text-sm text-[#554242]">
                  Tiket akan diterbitkan setelah pembayaran berhasil.
                </div>
              )}

              {isPaid &&
                allTickets.map((t, i) => {
                  const line = lines.find((l) => l.id === t.order_detail_id);
                  return (
                    <article
                      key={t.id}
                      className="relative flex flex-col justify-between gap-5 overflow-hidden rounded-xl bg-white p-6 shadow-sm md:flex-row md:items-center"
                    >
                      <span className="absolute inset-y-0 left-0 w-2 bg-[#5B0F18]" />

                      <div className="space-y-3 pl-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full bg-[#FFDAD9] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-[#2F1314]">
                            Tiket #{i + 1}
                          </span>
                          <span className="text-xl font-bold text-[#3B0008]">
                            {line?.category_name || "Tiket"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-[#554242]">
                          <span className="flex items-center gap-1">
                            <User size={16} className="text-[#A13C46]" />
                            Pemegang:
                            <strong className="ml-1 font-semibold text-[#1B1B1C]">
                              {order.customer_username || "-"}
                            </strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Ticket size={16} className="text-[#A13C46]" />
                            Kode:
                            <span className="ml-1 font-mono font-bold text-[#3B0008]">
                              {t.ticket_code}
                            </span>
                          </span>
                        </div>
                      </div>

                      <Link
                        href="/admin/tickets"
                        className="flex shrink-0 items-center justify-center gap-1 rounded-full bg-[#F0EDED] px-4 py-2 text-sm font-semibold text-[#3B0008] transition hover:bg-[#FFDADA] print:hidden"
                      >
                        <QrCode size={16} />
                        Lihat E-Ticket
                      </Link>
                    </article>
                  );
                })}

              {isPaid && (
                <Link
                  href="/admin/tickets"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5B0F18] py-4 text-lg font-bold text-white shadow-md transition hover:bg-[#3B0008] print:hidden"
                >
                  <QrCode size={24} />
                  Buka Semua E-Ticket
                </Link>
              )}
            </section>

            {/* Panduan */}
            <section className="space-y-5 rounded-xl bg-[#F6F3F2] p-6">
              <div className="flex items-center gap-3">
                <Info size={24} className="text-[#A13C46]" />
                <h3 className="text-xl font-bold text-[#3B0008]">
                  Panduan Masuk Venue
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <GuideItem
                  icon={CheckCircle}
                  title="Bawa E-Ticket & Identitas"
                  text="Tunjukkan QR e-ticket beserta identitas asli (KTP / Paspor / SIM) saat masuk."
                />
                <GuideItem
                  icon={CircleSlash}
                  iconColor="text-[#BA1A1A]"
                  title="Ketentuan Penyelenggara"
                  text="Barang yang dilarang dan aturan penukaran mengikuti ketentuan resmi penyelenggara event."
                />
              </div>

              {order.event_location && (
                <a
                  href={`https://maps.google.com/maps?q=${encodeURIComponent(
                    order.event_location
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-[#A13C46] hover:underline print:hidden"
                >
                  <MapPin size={16} />
                  Buka lokasi di Google Maps
                  <ExternalLink size={14} />
                </a>
              )}
            </section>
          </div>

          {/* ═══ KANAN ═══ */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:col-span-4">
            {/* Rincian pembayaran */}
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#F0EDED] pb-4">
                <h3 className="text-xl font-bold text-[#3B0008]">
                  Rincian Pembayaran
                </h3>
                <span className="rounded-full bg-[#F0EDED] px-2.5 py-1 text-xs font-bold uppercase text-[#1B1B1C]">
                  {totalQty} Tiket
                </span>
              </div>

              <div className="space-y-3 py-4">
                {lines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="text-[#1B1B1C]">
                      <span className="block font-semibold">
                        {line.quantity}x {line.category_name || "Tiket"}
                      </span>
                      <span className="text-sm text-[#554242]">
                        @ {currency(line.price)}
                      </span>
                    </div>
                    <span className="font-semibold text-[#1B1B1C]">
                      {currency(line.subtotal)}
                    </span>
                  </div>
                ))}

                {Number(order.service_fee) > 0 && (
                  <div className="flex items-center justify-between gap-3 text-[#1B1B1C]">
                    <span>Biaya Layanan</span>
                    <span>{currency(order.service_fee)}</span>
                  </div>
                )}

                {Number(order.discount_amount) > 0 && (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-[#F6F3F2] p-3 text-[#A13C46]">
                    <div className="flex items-center gap-2">
                      <Info size={18} />
                      <span className="text-sm font-bold">
                        {order.voucher_promo_code || "Voucher"}
                      </span>
                    </div>
                    <span className="text-base font-bold">
                      -{currency(order.discount_amount)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-baseline justify-between border-t border-[#F0EDED] pt-4">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#554242]">
                    {isPaid ? "Total Dibayar" : "Total Tagihan"}
                  </span>
                  {isPaid && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-[#A13C46]">
                      <CheckCircle2 size={14} />
                      Lunas
                    </span>
                  )}
                </div>
                <span className="text-3xl font-bold tracking-tight text-[#3B0008]">
                  {currency(order.grand_total)}
                </span>
              </div>
            </section>

            {/* Metode pembayaran */}
            <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#F0EDED] pb-3">
                <h3 className="text-xl font-bold text-[#3B0008]">
                  Metode & Data Pemesan
                </h3>
                <Wallet size={20} className="text-[#A13C46]" />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg bg-[#F6F3F2] p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-7 w-10 shrink-0 items-center justify-center rounded bg-white text-xs font-bold text-[#3B0008] shadow-sm">
                    {bankShort(payment?.payment_type)}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-sm font-semibold text-[#1B1B1C]">
                      {paymentLabel(payment?.payment_type)}
                    </span>
                    <span className="block truncate font-mono text-xs text-[#554242]">
                      {payment?.transaction_id || "-"}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-[#FFDADA] px-2 py-0.5 text-[11px] font-bold text-[#40000C]">
                  {payment?.transaction_status?.toUpperCase() || "PENDING"}
                </span>
              </div>

              <div className="space-y-2 text-sm text-[#554242]">
                {payment?.settlement_time && (
                  <RowKV
                    label="Waktu bayar"
                    value={formatDateTime(payment.settlement_time)}
                  />
                )}
                <RowKV label="Nama" value={order.customer_username || "-"} />
                <RowKV label="Email" value={order.customer_email || "-"} mono />
                <RowKV label="No. HP" value={order.customer_phone || "-"} mono />
              </div>
            </section>

            {/* Bantuan */}
            <section className="rounded-xl bg-[#5B0F18] p-6 text-white shadow-md print:hidden">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#442425]">
                  <Headphones size={22} className="text-[#FE848C]" />
                </div>
                <div>
                  <h4 className="text-xl font-bold leading-tight">
                    Butuh bantuan?
                  </h4>
                  <p className="mt-1 text-sm text-[#FFB3B3]">
                    Ada kendala dengan tiket atau pembayaran? Hubungi tim
                    Eventify.
                  </p>
                </div>
              </div>

              <a
                href={SUPPORT_WA}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-bold text-[#5B0F18] transition hover:bg-[#F6F3F2]"
              >
                <MessageCircle size={18} className="text-[#A13C46]" />
                Hubungi via WhatsApp
              </a>
            </section>
          </aside>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #order-print-area,
          #order-print-area * {
            visibility: visible;
          }
          #order-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-komponen ──────────────────────────────────────────────
function SpecItem({ label, value, icon: Icon }) {
  return (
    <div className="space-y-0.5">
      <span className="block text-xs font-bold uppercase tracking-wider text-[#554242]">
        {label}
      </span>
      <span className="flex items-center gap-1 text-sm font-bold text-[#3B0008]">
        <Icon size={16} className="text-[#A13C46]" />
        {value}
      </span>
    </div>
  );
}

function GuideItem({ icon: Icon, iconColor = "text-[#A13C46]", title, text }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-white p-4 shadow-sm">
      <Icon size={20} className={`mt-0.5 shrink-0 ${iconColor}`} />
      <div className="text-sm text-[#1B1B1C]">
        <strong className="block font-semibold text-[#3B0008]">{title}</strong>
        {text}
      </div>
    </div>
  );
}

function RowKV({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="shrink-0">{label}</span>
      <strong
        className={`min-w-0 break-all text-right text-[#1B1B1C] ${
          mono ? "font-mono text-xs" : "font-semibold"
        }`}
      >
        {value}
      </strong>
    </div>
  );
}