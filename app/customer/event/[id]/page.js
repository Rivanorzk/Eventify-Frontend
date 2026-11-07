"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home,
  ChevronRight,
  CalendarDays,
  Clock,
  MapPin,
  Ticket,
  Share2,
  Minus,
  Plus,
  Star,
  Flame,
  Info,
  ShoppingCart,
  Tag,
  ArrowRight,
  Loader2,
  AlertCircle,
  ExternalLink,
  Users,
  Crown,
  Gem,
  Check,
  Map as MapIcon,
  Gavel,
  Megaphone,
  Music,
} from "lucide-react";
import { toast } from "react-hot-toast";

import LoadingSpinner from "@/components/loadingSpinner";
import EmptyState from "@/components/emptyState";
import BackButton from "@/components/backButton";
import { currency, formatDate, formatDateTime } from "@/lib/formatter";

import { getEventById } from "@/services/eventService";
import { getEventTicketCategoryDetail } from "@/services/eventTicketCategoryService";

/*
 * Service yang BELUM saya lihat isinya (sesuaikan nama/path kalau beda).
 * Diasumsikan mengembalikan `data` seperti service lainnya:
 *   voucherService.getAvailableVouchers(eventId) -> GET /vouchers/available?event_id=
 *   orderService.createOrder(payload)            -> POST /orders
 *   paymentService.createPayment(orderId)        -> POST /payments { order_id } (balikan: { redirect_url })
 */
import { getAvailableVouchers } from "@/services/voucherService";
import { createOrder } from "@/services/orderService";
import { createPayment } from "@/services/paymentService";

// ─── Konstanta ─────────────────────────────────────────────────
// Halaman daftar event (yang memakai CategoryFilter). Ubah kalau rutenya beda.
const EVENT_LIST_PATH = "/customer/event";
const MAX_TICKETS_PER_ORDER = 4;

const TIER_STYLES = [
  { icon: Users, box: "bg-[#F6F3F2] text-[#5B0F18]", chip: "bg-[#F0EDED] text-[#554242]" },
  { icon: Crown, box: "bg-[#FDF3D8] text-[#B4841F]", chip: "bg-[#FDF3D8] text-[#B4841F]" },
  { icon: Gem, box: "bg-[#FFDADA] text-[#5B0F18]", chip: "bg-[#5B0F18] text-white" },
];

const toHHmm = (v) => (v ? `${String(v).slice(0, 5)} WIB` : "-");

// Sama dengan backend/lib/services/voucherService.calculateDiscount
function discountFor(voucher, total) {
  if (!voucher || !total) return 0;
  let d;
  if (voucher.discount_type === "percentage") {
    d = Math.floor((total * Number(voucher.discount_value)) / 100);
    if (voucher.maximum_discount != null && d > Number(voucher.maximum_discount)) {
      d = Number(voucher.maximum_discount);
    }
  } else {
    d = Number(voucher.discount_value);
  }
  return Math.min(d, total);
}

function stockInfo(tier) {
  const left = tier.remaining_stock;
  if (left <= 0) return { text: "Tiket habis", cls: "text-[#BA1A1A]" };
  if (left <= Math.max(10, tier.stock * 0.15))
    return { text: `Terbatas! Sisa ${left} tiket`, cls: "text-[#BA1A1A]" };
  if (left <= tier.stock * 0.3) return { text: `Tersisa ${left} tiket`, cls: "text-[#B4841F]" };
  return { text: "Kuota tersedia", cls: "text-[#A13C46]" };
}

const safe = (p) => p.catch(() => []);

// ─── Halaman ───────────────────────────────────────────────────
export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.id;

  const [event, setEvent] = useState(null);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [qty, setQty] = useState({});
  const [voucherId, setVoucherId] = useState(null);
  const [activeTier, setActiveTier] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      setError(null);

      const ev = await getEventById(eventId);

      // 1 panggilan per kategori: { ...kategori, description, is_active, areas, benefits, rules }
      const tiers = await Promise.all(
        (ev.ticket_categories || []).map(async (tc) => {
          let detail = {};
          try {
            detail = (await getEventTicketCategoryDetail(tc.id)) || {};
          } catch {
            /* tetap tampil tanpa area/benefit/rule */
          }
          return {
            ...tc,
            name: tc.category_name,
            description: detail.description ?? null,
            is_active: detail.is_active === undefined ? true : Boolean(detail.is_active),
            price: Number(tc.price),
            stock: Number(tc.stock),
            remaining_stock: Number(tc.remaining_stock),
            areas: detail.areas || [],
            benefits: detail.benefits || [],
            rules: detail.rules || [],
          };
        })
      );
      tiers.sort((a, b) => a.price - b.price);

      setEvent({ ...ev, tiers });
      setVouchers((await safe(getAvailableVouchers(eventId))) || []);
    } catch (err) {
      console.error("Load event error:", err);
      setError(err?.response?.data?.message || "Gagal memuat detail event.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  const tiers = useMemo(() => event?.tiers || [], [event]);
  const totalQty = useMemo(() => Object.values(qty).reduce((a, b) => a + b, 0), [qty]);

  // ─── Status penjualan ───────────────────────────────────────
  const saleState = useMemo(() => {
    if (!event) return "closed";
    if (event.status === "finished" || event.status === "cancelled") return "closed";
    if (event.status === "draft") return "upcoming";
    if (event.sales_start_at && new Date(event.sales_start_at) > new Date()) return "upcoming";
    if (tiers.length > 0 && tiers.every((t) => t.remaining_stock <= 0)) return "soldout";
    return "open";
  }, [event, tiers]);

  const canBuy = saleState === "open";

  const blockedReason = {
    upcoming:
      event?.sales_start_at && event?.status !== "draft"
        ? `Penjualan tiket dibuka ${formatDateTime(event.sales_start_at)}.`
        : "Event ini belum dibuka untuk penjualan tiket.",
    closed:
      event?.status === "cancelled"
        ? "Event ini dibatalkan."
        : "Penjualan tiket untuk event ini sudah ditutup.",
    soldout: "Semua tiket sudah terjual.",
    open: null,
  }[saleState];

  const saleBadge = {
    open: "Penjualan Dibuka",
    upcoming: "Segera Hadir",
    soldout: "Tiket Habis",
    closed: "Penjualan Ditutup",
  }[saleState];

  // ─── Statistik kuota ────────────────────────────────────────
  const totalStock = tiers.reduce((s, t) => s + t.stock, 0);
  const totalLeft = tiers.reduce((s, t) => s + Math.max(0, t.remaining_stock), 0);
  const percentLeft = totalStock ? Math.round((totalLeft / totalStock) * 100) : 0;

  const bestSellerId = useMemo(() => {
    if (tiers.length < 2) return null;
    const top = [...tiers].sort(
      (a, b) => b.stock - b.remaining_stock - (a.stock - a.remaining_stock)
    )[0];
    return top && top.stock - top.remaining_stock > 0 ? top.id : null;
  }, [tiers]);

  // ─── Keranjang & total (rumus = backend/lib/utils/pricing.js) ─
  const lines = useMemo(
    () =>
      tiers
        .filter((t) => (qty[t.id] || 0) > 0)
        .map((t) => ({
          id: t.id,
          name: t.name,
          price: t.price,
          qty: qty[t.id],
          subtotal: t.price * qty[t.id],
        })),
    [tiers, qty]
  );

  const selectedVoucher = vouchers.find((v) => v.id === voucherId) || null;

  // Lepas voucher otomatis kalau syarat minimal tiket tidak terpenuhi
  useEffect(() => {
    if (selectedVoucher && totalQty < Number(selectedVoucher.minimum_quantity || 1)) {
      setVoucherId(null);
    }
  }, [selectedVoucher, totalQty]);

  const totals = useMemo(() => {
    const ticketTotal = lines.reduce((s, l) => s + l.subtotal, 0);
    const discount = discountFor(selectedVoucher, ticketTotal);
    const feePercent = Number(event?.service_fee_percent || 0);
    const finalPrice = ticketTotal - discount;
    const serviceFee = Math.round((finalPrice * feePercent) / 100);
    return { ticketTotal, discount, feePercent, serviceFee, grandTotal: finalPrice + serviceFee };
  }, [lines, selectedVoucher, event]);

  // ─── Aksi ───────────────────────────────────────────────────
  const changeQty = (id, next) => {
    const nextQty = Math.max(0, next);
    const total = totalQty - (qty[id] || 0) + nextQty;
    if (total > MAX_TICKETS_PER_ORDER) {
      toast.error(`Maksimal ${MAX_TICKETS_PER_ORDER} tiket per pesanan.`);
      return;
    }
    setActiveTier(id);
    setQty((prev) => ({ ...prev, [id]: nextQty }));
  };

  const focusTier = (id) => {
    setActiveTier(id);
    document.getElementById(`tier-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Tautan disalin!");
      }
    } catch {
      /* dibatalkan pengguna */
    }
  };

  const handleCheckout = async () => {
    if (totalQty === 0) return toast.error("Pilih minimal 1 tiket.");
    setSubmitting(true);
    try {
      const order = await createOrder({
        event_id: Number(event.id),
        user_voucher_id: voucherId ?? null,
        // Backend memakai id baris event_ticket_categories sebagai "ticket_category_id"
        tickets: lines.map((l) => ({ ticket_category_id: l.id, quantity: l.qty })),
      });

      const payment = await createPayment(order.id);
      if (payment?.redirect_url) {
        window.location.href = payment.redirect_url; // halaman Midtrans Snap
      } else {
        router.push(`/customer/orders/${order.id}`);
      }
    } catch (err) {
      if (err?.response?.status === 401) return router.push("/login");
      toast.error(err?.response?.data?.message || "Gagal membuat pesanan.");
      setSubmitting(false);
    }
  };

  // ─── Loading / error ────────────────────────────────────────
  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-8 py-12">
        <LoadingSpinner text="Memuat detail event..." />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-7xl px-8 py-12">
        <EmptyState
          title="Event tidak ditemukan"
          description={error || "Data event tidak tersedia."}
        />
        <BackButton href="/customer" label="Kembali ke Beranda" className="mt-4" />
      </div>
    );
  }

  const hasCoords =
    Number.isFinite(Number(event.latitude)) &&
    Number.isFinite(Number(event.longitude)) &&
    (Number(event.latitude) !== 0 || Number(event.longitude) !== 0);
  const lat = Number(event.latitude);
  const lng = Number(event.longitude);
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://maps.google.com/maps?q=${encodeURIComponent(event.location || "")}`;
  const osmUrl = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`
    : null;

  const paragraphs = String(event.description || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const tiersWithRules = tiers.filter((t) => t.rules.length > 0);

  // Kembali ke daftar event dengan filter kategori sesuai event ini
  const backHref = event.category_id
    ? `${EVENT_LIST_PATH}?category=${event.category_id}`
    : EVENT_LIST_PATH;

  return (
    <div className="min-h-screen bg-[#FCF9F8]">
      <div className="mx-auto w-full max-w-7xl px-8 py-10 pb-32 lg:pb-10">
        <BackButton
          href={backHref}
          label={event.category_name ? `Kembali ke ${event.category_name}` : "Kembali ke Daftar Event"}
          className="mb-4"
        />

        {/* Breadcrumb */}
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[#554242]">
          <Link href="/customer" className="flex items-center gap-1 transition hover:text-[#3B0008]">
            <Home size={16} />
            Beranda
          </Link>
          {event.category_name && (
            <>
              <ChevronRight size={14} className="text-[#DBC0C0]" />
              <Link
                href={backHref}
                className="transition hover:text-[#3B0008]"
              >
                {event.category_name}
              </Link>
            </>
          )}
          <ChevronRight size={14} className="text-[#DBC0C0]" />
          <span className="max-w-xs truncate font-semibold text-[#5B0F18] md:max-w-md">
            {event.title}
          </span>
        </nav>

        {/* Hero */}
        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="relative h-72 w-full overflow-hidden md:h-96">
            {event.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.poster} alt={event.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#5B0F18]">
                <Music size={64} className="text-white/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#5B0F18] via-[#5B0F18]/50 to-transparent" />

            <div className="absolute left-6 top-6 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#FDF3D8] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#B4841F] shadow">
                {saleState === "open" && (
                  <span className="h-2 w-2 animate-ping rounded-full bg-[#B4841F]" />
                )}
                {saleBadge}
              </span>
              {event.category_name && (
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                  {event.category_name}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleShare}
              title="Bagikan event"
              className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition hover:bg-white/30"
            >
              <Share2 size={18} />
            </button>

            <div className="absolute bottom-6 left-6 right-6 text-white">
              {event.admin_username && (
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#FFDEAA]">
                  <Megaphone size={16} />
                  Diselenggarakan oleh {event.admin_username}
                </p>
              )}
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
                {event.title}
              </h1>
              <p className="mt-1 flex items-center gap-2 text-base text-white/90">
                <MapPin size={18} className="shrink-0 text-[#FE848C]" />
                {event.location || "-"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 bg-[#F6F3F2] p-6 sm:grid-cols-3">
            <SpecItem label="Tanggal" value={event.event_date ? formatDate(event.event_date) : "-"} icon={CalendarDays} />
            <SpecItem label="Mulai" value={toHHmm(event.start_time)} icon={Clock} />
            <SpecItem
              label="Kuota"
              value={
                totalStock === 0
                  ? "-"
                  : totalLeft === 0
                  ? "Habis"
                  : percentLeft <= 30
                  ? `Tersisa ${percentLeft}%`
                  : `${totalLeft.toLocaleString("id-ID")} tiket tersedia`
              }
              icon={Flame}
            />
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* ═══ KIRI ═══ */}
          <div className="space-y-8 lg:col-span-8">
            {/* Pilih tiket */}
            <section className="space-y-4" id="pilih-tiket">
              <div className="flex items-center gap-3">
                <span className="h-6 w-2.5 rounded-full bg-[#5B0F18]" />
                <h2 className="text-xl font-bold text-[#1B1B1C]">Pilih Kategori Tiket</h2>
              </div>

              {tiers.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#DBC0C0] bg-white p-6 text-sm text-[#554242]">
                  Kategori tiket untuk event ini belum tersedia.
                </div>
              )}

              {tiers.map((tier, i) => {
                const style = TIER_STYLES[Math.min(i, TIER_STYLES.length - 1)];
                const TierIcon = style.icon;
                const q = qty[tier.id] || 0;
                const stock = stockInfo(tier);
                const disabled = !canBuy || !tier.is_active || tier.remaining_stock <= 0;
                const maxForTier = Math.min(tier.remaining_stock, q + (MAX_TICKETS_PER_ORDER - totalQty));

                return (
                  <article
                    key={tier.id}
                    id={`tier-${tier.id}`}
                    className={`relative flex flex-col justify-between gap-5 overflow-hidden rounded-xl bg-white p-6 shadow-sm transition md:flex-row md:items-center ${
                      activeTier === tier.id ? "ring-2 ring-[#FFC55F]" : ""
                    }`}
                  >
                    <span className="absolute inset-y-0 left-0 w-2 bg-[#5B0F18]" />

                    {tier.id === bestSellerId && (
                      <span className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-xl bg-[#B4841F] px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                        <Star size={12} fill="currentColor" /> Best Seller
                      </span>
                    )}

                    <div className="flex min-w-0 items-start gap-4 pl-2">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${style.box}`}>
                        <TierIcon size={24} />
                      </div>
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-bold uppercase text-[#3B0008]">{tier.name}</h3>
                          {tier.areas[0] && (
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${style.chip}`}>
                              {tier.areas[0].floor || tier.areas[0].area_name}
                            </span>
                          )}
                        </div>

                        {tier.description && (
                          <p className="text-sm text-[#554242]">{tier.description}</p>
                        )}

                        <p className="flex flex-wrap items-center gap-x-3 text-sm">
                          <span className={`font-bold ${stock.cls}`}>{stock.text}</span>
                          {tier.areas.length > 0 && (
                            <span className="text-[#554242]">
                              • {tier.areas.map((a) => a.area_name).join(", ")}
                            </span>
                          )}
                        </p>

                        {tier.benefits.length > 0 && (
                          <ul className="flex flex-wrap gap-2 pt-1">
                            {tier.benefits.map((b) => (
                              <li
                                key={b.id}
                                title={b.description || undefined}
                                className="flex items-center gap-1 rounded-full bg-[#F6F3F2] px-2.5 py-1 text-xs font-semibold text-[#554242]"
                              >
                                <Check size={12} className="text-[#A13C46]" />
                                {b.title}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-4 md:flex-col md:items-end">
                      <div className="md:text-right">
                        <span className="block text-xs font-bold uppercase tracking-wider text-[#554242]">
                          Harga Tiket
                        </span>
                        <span className="text-2xl font-extrabold tracking-tight text-[#3B0008]">
                          {tier.price === 0 ? "Gratis" : currency(tier.price)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 rounded-full bg-[#F6F3F2] px-3 py-1.5">
                        <button
                          type="button"
                          aria-label="Kurangi"
                          disabled={q === 0}
                          onClick={() => changeQty(tier.id, q - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#1B1B1C] transition hover:bg-[#5B0F18] hover:text-white disabled:pointer-events-none disabled:opacity-30"
                        >
                          <Minus size={16} />
                        </button>
                        <span className={`w-6 text-center text-lg font-bold ${q > 0 ? "text-[#5B0F18]" : "text-[#1B1B1C]"}`}>
                          {q}
                        </span>
                        <button
                          type="button"
                          aria-label="Tambah"
                          disabled={disabled || q >= maxForTier}
                          onClick={() => changeQty(tier.id, q + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#1B1B1C] transition hover:bg-[#5B0F18] hover:text-white disabled:pointer-events-none disabled:opacity-30"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>

            {/* Deskripsi */}
            <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm" id="deskripsi-event">
              <div className="flex items-center gap-3">
                <span className="h-6 w-2.5 rounded-full bg-[#5B0F18]" />
                <h2 className="text-xl font-bold text-[#1B1B1C]">Deskripsi Event</h2>
              </div>
              <div className="space-y-3 text-sm leading-relaxed text-[#554242]">
                {paragraphs.length > 0 ? (
                  paragraphs.map((p, i) => <p key={i}>{p}</p>)
                ) : (
                  <p>Deskripsi event belum tersedia.</p>
                )}
              </div>
            </section>

            {/* Syarat & ketentuan */}
            <section className="space-y-5 rounded-xl bg-[#F6F3F2] p-6" id="ketentuan">
              <div className="flex items-center gap-3">
                <Info size={24} className="text-[#A13C46]" />
                <h3 className="text-xl font-bold text-[#3B0008]">Syarat &amp; Ketentuan Tiket</h3>
              </div>

              {tiersWithRules.length === 0 && (
                <p className="text-sm text-[#554242]">Belum ada ketentuan khusus untuk event ini.</p>
              )}

              {tiersWithRules.map((tier) => (
                <div key={tier.id} className="space-y-3">
                  {tiersWithRules.length > 1 && (
                    <h4 className="text-sm font-bold uppercase tracking-wider text-[#5B0F18]">
                      {tier.name}
                    </h4>
                  )}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {tier.rules.map((r) => (
                      <div key={r.id} className="flex items-start gap-3 rounded-lg bg-white p-4 shadow-sm">
                        <Gavel size={20} className="mt-0.5 shrink-0 text-[#A13C46]" />
                        <div className="text-sm text-[#1B1B1C]">
                          <strong className="block font-semibold text-[#3B0008]">{r.title}</strong>
                          {r.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            {/* Lokasi */}
            <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm" id="lokasi-venue">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="h-6 w-2.5 rounded-full bg-[#5B0F18]" />
                  <h2 className="text-xl font-bold text-[#1B1B1C]">Lokasi</h2>
                </div>
                {(hasCoords || event.location) && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#A13C46] hover:underline"
                  >
                    <MapPin size={16} />
                    Buka di Google Maps
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
              <p className="text-sm text-[#554242]">{event.location || "Lokasi belum ditentukan"}</p>
              {osmUrl && (
                <iframe
                  title="Peta lokasi"
                  src={osmUrl}
                  loading="lazy"
                  className="h-64 w-full rounded-xl border-0"
                />
              )}
            </section>
          </div>

          {/* ═══ KANAN ═══ */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:col-span-4">
            {/* Denah ringkas */}
            <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#F0EDED] pb-3">
                <h3 className="text-xl font-bold text-[#3B0008]">Denah Area</h3>
                <MapIcon size={20} className="text-[#A13C46]" />
              </div>

              <div className="space-y-2 rounded-lg bg-[#F6F3F2] p-3">
                <div className="rounded-lg bg-[#5B0F18] py-2 text-center text-sm font-black tracking-widest text-white">
                  STAGE
                </div>
                {tiers.map((tier) => {
                  const areaText = tier.areas.length
                    ? tier.areas.map((a) => [a.area_name, a.floor].filter(Boolean).join(" · ")).join(" / ")
                    : "Area umum";
                  const picked = (qty[tier.id] || 0) > 0;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => focusTier(tier.id)}
                      className={`w-full rounded-lg bg-white p-3 text-center transition hover:bg-[#FFDADA] ${
                        picked || activeTier === tier.id ? "ring-2 ring-[#FFC55F]" : ""
                      }`}
                    >
                      <span className="block text-xs font-bold uppercase tracking-wider text-[#3B0008]">
                        {tier.name}
                      </span>
                      <span className="block text-xs text-[#554242]">{areaText}</span>
                      <span className="block text-xs font-bold text-[#A13C46]">
                        {tier.price === 0 ? "Gratis" : currency(tier.price)}
                      </span>
                    </button>
                  );
                })}
                {tiers.length === 0 && (
                  <p className="py-3 text-center text-xs text-[#554242]">Denah belum tersedia.</p>
                )}
              </div>
              <p className="text-xs text-[#554242]">Klik kategori untuk menyorot kartu tiketnya.</p>
            </section>

            {/* Ringkasan pesanan */}
            <section className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#F0EDED] pb-4">
                <h3 className="text-xl font-bold text-[#3B0008]">Ringkasan Pesanan</h3>
                <span className="flex items-center gap-1 rounded-full bg-[#F0EDED] px-2.5 py-1 text-xs font-bold uppercase text-[#1B1B1C]">
                  <ShoppingCart size={12} />
                  {totalQty} Tiket
                </span>
              </div>

              <div className="space-y-3">
                {lines.length === 0 ? (
                  <p className="rounded-lg bg-[#F6F3F2] p-3 text-sm text-[#554242]">
                    Belum ada tiket dipilih.
                  </p>
                ) : (
                  lines.map((l) => (
                    <div key={l.id} className="flex items-start justify-between gap-3">
                      <div className="text-[#1B1B1C]">
                        <span className="block font-semibold uppercase">
                          {l.qty}x {l.name}
                        </span>
                        <span className="text-sm text-[#554242]">@ {currency(l.price)}</span>
                      </div>
                      <span className="font-semibold text-[#1B1B1C]">{currency(l.subtotal)}</span>
                    </div>
                  ))
                )}

                {vouchers.length > 0 && (
                  <label className="block space-y-1">
                    <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#554242]">
                      <Tag size={12} className="text-[#B4841F]" /> Voucher
                    </span>
                    <select
                      value={voucherId ?? ""}
                      onChange={(e) => setVoucherId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full rounded-lg border border-[#DBC0C0] bg-[#F6F3F2] px-3 py-2 text-sm text-[#1B1B1C] focus:outline-none focus:ring-2 focus:ring-[#5B0F18]"
                    >
                      <option value="">Tanpa voucher</option>
                      {vouchers.map((v) => (
                        <option
                          key={v.id}
                          value={v.id}
                          disabled={totalQty < Number(v.minimum_quantity || 1)}
                        >
                          {v.title || v.promo_code}
                          {v.minimum_quantity > 1 ? ` (min. ${v.minimum_quantity} tiket)` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {totals.discount > 0 && (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-[#F6F3F2] p-3 text-[#A13C46]">
                    <div className="flex items-center gap-2">
                      <Info size={18} />
                      <span className="text-sm font-bold">
                        {selectedVoucher?.promo_code || "Voucher"}
                      </span>
                    </div>
                    <span className="text-base font-bold">-{currency(totals.discount)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 text-sm text-[#554242]">
                  <span>Biaya Layanan{totals.feePercent ? ` (${totals.feePercent}%)` : ""}</span>
                  <span className="font-semibold text-[#1B1B1C]">{currency(totals.serviceFee)}</span>
                </div>
              </div>

              <div className="flex items-baseline justify-between border-t border-[#F0EDED] pt-4">
                <span className="block text-xs font-bold uppercase tracking-wider text-[#554242]">
                  Total Pembayaran
                </span>
                <span className="text-3xl font-bold tracking-tight text-[#3B0008]">
                  {currency(totals.grandTotal)}
                </span>
              </div>

              {blockedReason && (
                <div className="flex items-start gap-2 rounded-lg bg-[#F6F3F2] p-3 text-sm text-[#554242]">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-[#A13C46]" />
                  {blockedReason}
                </div>
              )}

              <button
                type="button"
                onClick={handleCheckout}
                disabled={!canBuy || submitting || totalQty === 0}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5B0F18] py-3.5 text-base font-bold text-white shadow-md transition hover:bg-[#3B0008] disabled:pointer-events-none disabled:opacity-40"
              >
                {submitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Memproses...
                  </>
                ) : (
                  <>
                    Lanjut ke Pembayaran <ArrowRight size={20} />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-[#554242]">
                Maksimal {MAX_TICKETS_PER_ORDER} tiket per pesanan. Pembayaran harus diselesaikan dalam 15 menit.
              </p>
            </section>
          </aside>
        </div>
      </div>

      {/* Bar bawah (mobile / tablet) */}
      <aside className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur-xl lg:hidden">
        <div>
          <span className="block text-xs font-bold uppercase tracking-wider text-[#554242]">
            {totalQty > 0 ? `${totalQty} tiket` : "Belum ada tiket"}
          </span>
          <span className="text-lg font-extrabold text-[#3B0008]">{currency(totals.grandTotal)}</span>
        </div>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={!canBuy || submitting || totalQty === 0}
          className="flex items-center gap-1.5 rounded-full bg-[#5B0F18] px-6 py-2.5 text-sm font-bold text-white shadow-md disabled:pointer-events-none disabled:opacity-40"
        >
          <Ticket size={16} /> Beli
        </button>
      </aside>
    </div>
  );
}

// ─── Sub-komponen ──────────────────────────────────────────────
function SpecItem({ label, value, icon: Icon }) {
  return (
    <div className="space-y-0.5">
      <span className="block text-xs font-bold uppercase tracking-wider text-[#554242]">{label}</span>
      <span className="flex items-center gap-1 text-sm font-bold text-[#3B0008]">
        <Icon size={16} className="text-[#A13C46]" />
        {value}
      </span>
    </div>
  );
}