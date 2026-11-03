"use client";

import Link from "next/link";
import localFont from "next/font/local";
import {
    ArrowRight,
    CalendarDays,
    CheckCircle2,
    Flame,
    Heart,
    MapPin,
    Menu,
    Music,
    Search,
    ShieldCheck,
    Sparkles,
    Ticket,
    Users,
    X,
    Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";

/* ---------------------------------------------------------
   FONTS
--------------------------------------------------------- */
const display = localFont({
    src: [
        { path: "../public/fonts/Oswald-Medium.ttf", weight: "500" },
        { path: "../public/fonts/Oswald-SemiBold.ttf", weight: "600" },
        { path: "../public/fonts/Oswald-Bold.ttf", weight: "700" },
    ],
    variable: "--font-display",
    display: "swap",
});

const body = localFont({
    src: [
        { path: "../public/fonts/PlusJakartaSans-Regular.ttf", weight: "400" },
        { path: "../public/fonts/PlusJakartaSans-Medium.ttf", weight: "500" },
        { path: "../public/fonts/PlusJakartaSans-SemiBold.ttf", weight: "600" },
        { path: "../public/fonts/PlusJakartaSans-Bold.ttf", weight: "700" },
        { path: "../public/fonts/PlusJakartaSans-ExtraBold.ttf", weight: "800" },
    ],
    variable: "--font-body",
    display: "swap",
});

/* ---------------------------------------------------------
   DATA
--------------------------------------------------------- */
const categories = [
    { name: "Semua", icon: Sparkles, count: `${4}+ Event` },
    { name: "Concert", icon: Music, count: "120+ Event" },
    { name: "Music Festival", icon: Sparkles, count: "80+ Event" },
    { name: "K-Pop", icon: Users, count: "45+ Event" },
    { name: "Rock", icon: Music, count: "35+ Event" },
    { name: "Jazz", icon: Music, count: "25+ Event" },
];

const events = [
    {
        id: 1,
        title: "Sound of Summer",
        category: "Music Festival",
        date: "22 Agustus 2026",
        location: "Jakarta International Stadium",
        city: "Jakarta",
        price: 350000,
        soldPercent: 68,
        trending: true,
        image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85",
    },
    {
        id: 2,
        title: "Nusantara Music Fest",
        category: "Music Festival",
        date: "29 Agustus 2026",
        location: "Gelora Bung Karno",
        city: "Jakarta",
        price: 275000,
        soldPercent: 41,
        trending: false,
        image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=85",
    },
    {
        id: 3,
        title: "Midnight Symphony",
        category: "Concert",
        date: "5 September 2026",
        location: "The Kasablanka",
        city: "Jakarta",
        price: 450000,
        soldPercent: 87,
        trending: true,
        image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=85",
    },
    {
        id: 4,
        title: "Rock Revolution",
        category: "Rock",
        date: "12 September 2026",
        location: "ICE BSD City",
        city: "Tangerang",
        price: 500000,
        soldPercent: 23,
        trending: false,
        image: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=85",
    },
];

function formatCurrency(value) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
}

/* ---------------------------------------------------------
   SMALL HOOKS
--------------------------------------------------------- */
function useReveal() {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return [ref, visible];
}

function useCountUp(target, active, duration = 1400) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!active) return;
        let raf;
        let start;

        const step = (timestamp) => {
            if (start === undefined) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            setValue(Math.floor(progress * target));
            if (progress < 1) raf = requestAnimationFrame(step);
        };

        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [active, target, duration]);

    return value;
}

function Reveal({ children, className = "", delay = 0 }) {
    const [ref, visible] = useReveal();
    return (
        <div
            ref={ref}
            style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
            className={`transition-all duration-700 ease-out ${
                visible ? "translate-y-0 opacity-100 scale-100" : "translate-y-8 opacity-0 scale-95"
            } ${className}`}
        >
            {children}
        </div>
    );
}

export default function LandingPage() {
    const [mobileMenu, setMobileMenu] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeCategory, setActiveCategory] = useState("Semua");
    const [query, setQuery] = useState("");
    const [saved, setSaved] = useState(new Set());

    const [statsRef, statsVisible] = useReveal();
    const eventCount = useCountUp(100, statsVisible);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const filteredEvents = useMemo(() => {
        return events.filter((event) => {
            const matchesCategory =
                activeCategory === "Semua" || event.category === activeCategory;
            const matchesQuery =
                query.trim() === "" ||
                event.title.toLowerCase().includes(query.toLowerCase()) ||
                event.city.toLowerCase().includes(query.toLowerCase());
            return matchesCategory && matchesQuery;
        });
    }, [activeCategory, query]);

    function toggleSaved(id) {
        setSaved((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    return (
        <main
            className={`${display.variable} ${body.variable} min-h-screen bg-[#F8F1E7] text-[#1E1E1E] selection:bg-[#5B0F18] selection:text-white`}
            style={{ fontFamily: "var(--font-body)" }}
        >
            <style>{`
                @keyframes marquee {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
                .animate-marquee { animation: marquee 26s linear infinite; }
                .animate-marquee:hover { animation-play-state: paused; }
                @media (prefers-reduced-motion: reduce) {
                    .animate-marquee { animation: none; }
                }
                .font-display { font-family: var(--font-display); }
            `}</style>

            {/* FLOATING NAVBAR */}
            <div className="fixed left-0 right-0 top-0 z-50 px-5 pt-5 transition-all">
                <header
                    className={`mx-auto max-w-7xl rounded-full transition-all duration-500 ${
                        scrolled
                            ? "bg-[#5B0F18]/90 shadow-xl shadow-black/10 backdrop-blur-md border border-white/10 py-3 px-6"
                            : "bg-transparent py-4 px-2"
                    }`}
                >
                    <nav className="flex items-center justify-between">
                        {/* Logo + Brand */}
                        <Link href="/" className="flex items-center gap-2">
                            <Image
                                src="/Eventify.png"          // ✅ path diperbaiki
                                alt="Logo Eventify"
                                width={48}                   // ✅ ukuran proporsional
                                height={48}
                                className="h-16 w-16 object-contain -mr-3"
                                priority
                            />
                            <span className="font-display text-2xl font-bold uppercase tracking-tight text-white">
                                Eventify
                            </span>
                        </Link>

                        <div className="hidden items-center gap-8 md:flex">
                            <a href="#events" className="text-sm font-medium text-white/80 transition hover:text-white">
                                Event
                            </a>
                            <a href="#categories" className="text-sm font-medium text-white/80 transition hover:text-white">
                                Kategori
                            </a>
                            <a href="#about" className="text-sm font-medium text-white/80 transition hover:text-white">
                                Tentang Kami
                            </a>
                        </div>

                        <div className="hidden items-center gap-3 md:flex">
                            <Link
                                href="/login"
                                className="rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                            >
                                Masuk
                            </Link>
                            <Link
                                href="/register"
                                className="rounded-full bg-white px-6 py-2 text-sm font-bold text-[#5B0F18] transition hover:scale-105 hover:shadow-lg"
                            >
                                Daftar
                            </Link>
                        </div>

                        <button
                            onClick={() => setMobileMenu(!mobileMenu)}
                            className="rounded-full p-2 text-white md:hidden"
                        >
                            {mobileMenu ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </nav>
                </header>

                {/* MOBILE MENU */}
                {mobileMenu && (
                    <div className="mx-auto mt-2 max-w-7xl rounded-3xl border border-white/10 bg-[#5B0F18]/95 p-5 backdrop-blur-xl md:hidden shadow-2xl">
                        <div className="flex flex-col gap-2">
                            <a href="#events" onClick={() => setMobileMenu(false)} className="rounded-2xl px-5 py-3 text-white font-medium hover:bg-white/10">Event</a>
                            <a href="#categories" onClick={() => setMobileMenu(false)} className="rounded-2xl px-5 py-3 text-white font-medium hover:bg-white/10">Kategori</a>
                            <a href="#about" onClick={() => setMobileMenu(false)} className="rounded-2xl px-5 py-3 text-white font-medium hover:bg-white/10">Tentang Kami</a>
                            <div className="my-2 h-px bg-white/10" />
                            <Link href="/login" className="rounded-2xl px-5 py-3 text-white font-medium hover:bg-white/10">Masuk</Link>
                            <Link href="/register" className="rounded-2xl bg-white px-5 py-3 text-center font-bold text-[#5B0F18]">Daftar</Link>
                        </div>
                    </div>
                )}
            </div>

            {/* HERO SECTION */}
            <section className="relative min-h-[90vh] overflow-hidden bg-[#5B0F18] flex flex-col justify-center rounded-b-[3rem] lg:rounded-b-[4rem]">
                <div
                    className="absolute inset-0 scale-105 bg-cover bg-center opacity-60 mix-blend-overlay"
                    style={{
                        backgroundImage: "url('https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=2200&q=85')",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#5B0F18] via-[#5B0F18]/70 to-[#5B0F18]/40" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#5B0F18] via-transparent to-[#5B0F18]" />

                <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-5 pt-32 pb-20 text-center lg:px-8">
                    <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#D4A537]/30 bg-[#D4A537]/10 px-5 py-2.5 text-sm font-semibold text-[#D4A537] backdrop-blur animate-[fadeUp_0.6s_ease-out]">
                        <Sparkles size={16} />
                        Akses Eksklusif Event Terbaik
                    </div>

                    <h1 className="font-display text-5xl font-semibold uppercase leading-[1.1] tracking-tight text-white sm:text-7xl lg:text-[5.5rem]">
                        Rasakan Momen
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#D8A7A7] to-[#D4A537]">
                            Tak Terlupakan
                        </span>
                    </h1>

                    <p className="mt-8 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
                        Dari festival musik terbesar hingga konser intim artis favoritmu. Pesan tiket dengan mulus, aman, dan nikmati euforianya bersama Eventify.
                    </p>

                    {/* FLOATING SEARCH BAR */}
                    <div className="mt-12 w-full max-w-2xl animate-[fadeUp_0.8s_ease-out]">
                        <div className="flex w-full flex-col sm:flex-row items-center gap-2 rounded-[2rem] sm:rounded-full bg-white/10 p-2 backdrop-blur-md border border-white/20 shadow-2xl">
                            <div className="flex w-full flex-1 items-center gap-3 rounded-full bg-white px-6 py-4 transition focus-within:ring-4 focus-within:ring-[#D4A537]/30">
                                <Search size={20} className="text-[#7A1F2B]" />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Cari konser, festival, atau artis..."
                                    className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-[#1E1E1E]/40"
                                />
                            </div>
                            <a
                                href="#events"
                                className="w-full sm:w-auto flex-shrink-0 rounded-full bg-[#7A1F2B] px-8 py-4 text-sm font-bold text-white transition hover:bg-[#D4A537] hover:text-[#5B0F18]"
                            >
                                Cari Event
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* MARQUEE TICKER */}
            <div className="overflow-hidden border-b border-[#D4A537]/20 bg-[#F8F1E7] py-4">
                <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
                    {[...events, ...events].map((event, i) => (
                        <span
                            key={`${event.id}-${i}`}
                            className="flex items-center gap-3 text-sm font-bold uppercase tracking-widest text-[#5B0F18]"
                        >
                            <Ticket size={16} className="text-[#D4A537]" />
                            {event.title}
                            <span className="text-[#5B0F18]/40">— {event.city}</span>
                            <span className="mx-6 text-[#D8A7A7]">•</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* CATEGORY (CHIPS & BENTO STYLE) */}
            <section id="categories" className="py-24">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <Reveal className="mb-12 flex flex-col items-center text-center">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#7A1F2B]">
                            Explore
                        </p>
                        <h2 className="font-display text-4xl font-semibold uppercase tracking-tight text-[#1E1E1E] sm:text-5xl">
                            Pilih Kategorimu
                        </h2>
                    </Reveal>

                    <div className="flex flex-wrap justify-center gap-4">
                        {categories.map((category, i) => {
                            const Icon = category.icon;
                            const isActive = activeCategory === category.name;

                            return (
                                <Reveal key={category.name} delay={i * 50}>
                                    <button
                                        onClick={() => setActiveCategory(category.name)}
                                        aria-pressed={isActive}
                                        className={`group flex items-center gap-4 rounded-full border py-3 px-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                                            isActive
                                                ? "border-[#5B0F18] bg-[#5B0F18] text-white shadow-lg"
                                                : "border-[#D8A7A7]/50 bg-white text-[#1E1E1E]"
                                        }`}
                                    >
                                        <div
                                            className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                                                isActive
                                                    ? "bg-[#D4A537] text-[#5B0F18]"
                                                    : "bg-[#F8F1E7] text-[#7A1F2B] group-hover:bg-[#5B0F18] group-hover:text-white"
                                            }`}
                                        >
                                            <Icon size={18} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold">{category.name}</p>
                                            <p
                                                className={`text-xs ${
                                                    isActive ? "text-white/70" : "text-black/40"
                                                }`}
                                            >
                                                {category.count}
                                            </p>
                                        </div>
                                    </button>
                                </Reveal>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* EVENTS (POSTER STYLE CARDS) */}
            <section id="events" className="bg-[#FDFAF3] py-24 rounded-[3rem] lg:rounded-[4rem] mx-2 lg:mx-6 shadow-sm border border-[#D8A7A7]/20">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <Reveal className="mb-14 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
                        <div>
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#7A1F2B]">
                                Jangan Lewatkan
                            </p>
                            <h2 className="font-display text-4xl font-semibold uppercase tracking-tight text-[#1E1E1E] sm:text-5xl">
                                Trending Minggu Ini
                            </h2>
                        </div>
                        <Link
                            href="/"
                            className="flex items-center gap-2 rounded-full border border-[#5B0F18]/20 bg-transparent px-6 py-3 text-sm font-bold text-[#5B0F18] transition hover:bg-[#5B0F18] hover:text-white"
                        >
                            Lihat Semua
                            <ArrowRight size={16} />
                        </Link>
                    </Reveal>

                    {filteredEvents.length === 0 ? (
                        <Reveal className="flex flex-col items-center gap-5 rounded-[3rem] bg-white border border-dashed border-[#D8A7A7] py-24 text-center shadow-sm">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F8F1E7]">
                                <Ticket size={32} className="text-[#D8A7A7]" />
                            </div>
                            <p className="text-xl font-bold text-[#1E1E1E]">Belum ada event yang cocok</p>
                            <p className="max-w-md text-sm text-[#1E1E1E]/50">
                                Coba kata kunci lain atau lihat semua kategori yang tersedia.
                            </p>
                            <button
                                onClick={() => {
                                    setActiveCategory("Semua");
                                    setQuery("");
                                }}
                                className="mt-2 rounded-full bg-[#5B0F18] px-8 py-3 text-sm font-bold text-white transition hover:bg-[#7A1F2B]"
                            >
                                Tampilkan Semua
                            </button>
                        </Reveal>
                    ) : (
                        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                            {filteredEvents.map((event, i) => {
                                const isSaved = saved.has(event.id);
                                const isAlmostSoldOut = event.soldPercent >= 75;

                                return (
                                    <Reveal key={event.id} delay={i * 100}>
                                        <div className="group relative flex flex-col overflow-hidden rounded-[2rem] bg-white p-2 shadow-sm transition duration-500 hover:-translate-y-2 hover:shadow-xl border border-[#D8A7A7]/20">
                                            
                                            {/* Poster Image */}
                                            <Link href={`/customer/event/${event.id}`}>
                                                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]">
                                                    <img
                                                        src={event.image}
                                                        alt={event.title}
                                                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                                                    
                                                    {/* Badges */}
                                                    <div className="absolute left-3 top-3 flex flex-col items-start gap-2">
                                                        <span className="rounded-full bg-white/95 backdrop-blur px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#5B0F18] shadow-sm">
                                                            {event.category}
                                                        </span>
                                                        {event.trending && (
                                                            <span className="flex items-center gap-1 rounded-full bg-[#D4A537] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#5B0F18] shadow-sm">
                                                                <Flame size={12} strokeWidth={3} />
                                                                Trending
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>

                                            {/* Wishlist Toggle */}
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    toggleSaved(event.id);
                                                }}
                                                aria-label={isSaved ? "Hapus dari tersimpan" : "Simpan event"}
                                                className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#5B0F18] backdrop-blur transition hover:scale-110 shadow-sm"
                                            >
                                                <Heart size={18} className={isSaved ? "fill-[#7A1F2B] text-[#7A1F2B]" : ""} />
                                            </button>

                                            {/* Card Content */}
                                            <Link href={`/customer/event/${event.id}`} className="flex flex-1 flex-col p-5">
                                                <h3 className="line-clamp-2 font-display text-xl font-bold uppercase leading-tight text-[#1E1E1E]">
                                                    {event.title}
                                                </h3>

                                                <div className="mt-4 space-y-2 mb-4">
                                                    <div className="flex items-center gap-2 text-sm font-medium text-[#1E1E1E]/60">
                                                        <CalendarDays size={16} className="text-[#D8A7A7]" />
                                                        {event.date}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm font-medium text-[#1E1E1E]/60">
                                                        <MapPin size={16} className="text-[#D8A7A7]" />
                                                        <span className="line-clamp-1">{event.location}</span>
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-4 border-t border-[#F8F1E7]">
                                                    {isAlmostSoldOut && (
                                                        <div className="mb-4">
                                                            <div className="mb-2 flex items-center justify-between text-xs font-bold">
                                                                <span className="flex items-center gap-1 text-[#7A1F2B]">
                                                                    <Flame size={14} /> Tiket menipis
                                                                </span>
                                                                <span className="text-[#1E1E1E]/40">{event.soldPercent}%</span>
                                                            </div>
                                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F8F1E7]">
                                                                <div
                                                                    className="h-full rounded-full bg-gradient-to-r from-[#D4A537] to-[#7A1F2B]"
                                                                    style={{ width: `${event.soldPercent}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex items-end justify-between">
                                                        <div>
                                                            <p className="text-[11px] font-bold uppercase tracking-wider text-[#1E1E1E]/40">Mulai dari</p>
                                                            <p className="text-lg font-black text-[#5B0F18]">
                                                                {formatCurrency(event.price)}
                                                            </p>
                                                        </div>
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F8F1E7] text-[#5B0F18] transition-colors group-hover:bg-[#5B0F18] group-hover:text-white">
                                                            <ArrowRight size={18} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                    </Reveal>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* WHY EVENTIFY - BENTO BOX GRID */}
            <section id="about" className="py-24">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <Reveal className="mb-12">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#7A1F2B]">
                            Kenapa Eventify?
                        </p>
                        <h2 className="font-display text-4xl font-semibold uppercase tracking-tight text-[#1E1E1E] sm:text-5xl">
                            Satu Platform, <br className="hidden sm:block" />
                            <span className="text-[#D4A537]">Ribuan Pengalaman.</span>
                        </h2>
                    </Reveal>

                    <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Box 1: Text content (Spans 2 columns) */}
                        <Reveal delay={0} className="md:col-span-2 rounded-[2rem] bg-white p-8 md:p-12 shadow-sm border border-[#D8A7A7]/20 flex flex-col justify-center">
                            <p className="max-w-xl text-lg leading-relaxed text-[#1E1E1E]/70 font-medium mb-8">
                                Eventify didesain untuk memudahkanmu menemukan event, memproses pembelian tiket dalam hitungan detik, dan menyimpan tiket digital tanpa repot mencetak kertas.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                {[
                                    "Pembelian Cepat",
                                    "Tiket Digital",
                                    "100% Aman",
                                ].map((item) => (
                                    <div key={item} className="flex items-center gap-2 rounded-full bg-[#F8F1E7] px-4 py-2 text-sm font-bold text-[#5B0F18]">
                                        <CheckCircle2 size={16} className="text-[#7A1F2B]" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </Reveal>

                        {/* Box 2: Total Events */}
                        <Reveal delay={100} className="rounded-[2rem] bg-[#5B0F18] p-8 md:p-10 text-white flex flex-col justify-between">
                            <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur">
                                <Ticket size={28} className="text-[#D4A537]" />
                            </div>
                            <div className="mt-12">
                                <p className="font-display text-5xl font-semibold">{eventCount}+</p>
                                <p className="mt-2 text-sm font-medium text-white/60 uppercase tracking-widest">Event Tersedia</p>
                            </div>
                        </Reveal>

                        {/* Box 3: Trusted */}
                        <Reveal delay={200} className="rounded-[2rem] bg-[#D8A7A7] p-8 md:p-10 text-[#5B0F18] flex flex-col justify-between">
                            <div className="h-14 w-14 rounded-2xl bg-white/30 flex items-center justify-center">
                                <ShieldCheck size={28} />
                            </div>
                            <div className="mt-12">
                                <p className="font-display text-3xl font-semibold uppercase">Aman</p>
                                <p className="mt-2 text-sm font-bold text-[#5B0F18]/60 uppercase tracking-widest">Transaksi Terjamin</p>
                            </div>
                        </Reveal>

                        {/* Box 4: Fast */}
                        <Reveal delay={300} className="rounded-[2rem] bg-[#F8F1E7] p-8 md:p-10 flex flex-col justify-between border border-[#D8A7A7]/20">
                            <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                                <Zap size={28} className="text-[#7A1F2B]" />
                            </div>
                            <div className="mt-12">
                                <p className="font-display text-3xl font-semibold uppercase text-[#1E1E1E]">Cepat</p>
                                <p className="mt-2 text-sm font-bold text-[#1E1E1E]/40 uppercase tracking-widest">Tanpa Antre</p>
                            </div>
                        </Reveal>

                        {/* Box 5: Digital */}
                        <Reveal delay={400} className="rounded-[2rem] bg-[#7A1F2B] p-8 md:p-10 text-white flex flex-col justify-between">
                            <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur">
                                <CheckCircle2 size={28} className="text-[#D8A7A7]" />
                            </div>
                            <div className="mt-12">
                                <p className="font-display text-3xl font-semibold uppercase">Digital</p>
                                <p className="mt-2 text-sm font-medium text-white/60 uppercase tracking-widest">Akses Mudah</p>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* CTA (FLOATING CARD STYLE) */}
            <section className="py-24 px-5 lg:px-8">
                <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[3rem] lg:rounded-[4rem] bg-[#5B0F18] px-6 py-20 text-center shadow-2xl">
                    <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#D4A537]/20 blur-[100px]" />
                    <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-[#D8A7A7]/20 blur-[100px]" />
                    <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />

                    <div className="relative z-10 flex flex-col items-center">
                        <span className="mb-6 rounded-full bg-[#7A1F2B] px-4 py-2 text-xs font-bold uppercase tracking-widest text-white">
                            Mulai Sekarang
                        </span>
                        <h2 className="font-display text-4xl font-semibold uppercase tracking-tight text-white sm:text-6xl max-w-3xl">
                            Siap Membuat Momen <br />
                            <span className="text-[#D4A537]">Yang Tak Terlupakan?</span>
                        </h2>
                        <p className="mt-6 max-w-xl leading-relaxed text-white/70">
                            Jangan sampai kehabisan tiket! Gabung bersama ribuan pengguna lain dan amankan tempatmu di event terbaik tahun ini.
                        </p>
                        <Link
                            href="/customer/event"
                            className="mt-10 inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 font-bold text-[#5B0F18] shadow-lg transition-all hover:scale-105 hover:bg-[#F8F1E7] hover:shadow-xl"
                        >
                            Eksplorasi Event
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </Reveal>
            </section>

            {/* FOOTER */}
            <footer className="bg-[#1E1E1E] pt-20 pb-10 text-white rounded-t-[3rem] lg:rounded-t-[4rem]">
                <div className="mx-auto max-w-7xl px-5 lg:px-8">
                    <div className="grid gap-12 md:grid-cols-4 lg:gap-8">
                        <div className="md:col-span-2 pr-0 lg:pr-12">
                            <Link href="/" className="font-display text-4xl font-bold tracking-tight text-white">
                                Eventify.
                            </Link>
                            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/50 font-medium">
                                Platform pemesanan tiket event modern yang memudahkanmu menemukan pengalaman terbaik, menyatukan orang-orang melalui musik, seni, dan hiburan.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-bold uppercase tracking-widest text-[#D4A537] text-xs mb-6">Navigasi</h4>
                            <div className="space-y-4 text-sm font-medium text-white/70">
                                <a href="#events" className="block transition hover:text-white hover:translate-x-1">Event</a>
                                <a href="#categories" className="block transition hover:text-white hover:translate-x-1">Kategori</a>
                                <a href="#about" className="block transition hover:text-white hover:translate-x-1">Tentang Kami</a>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold uppercase tracking-widest text-[#D4A537] text-xs mb-6">Akun</h4>
                            <div className="space-y-4 text-sm font-medium text-white/70">
                                <Link href="/login" className="block transition hover:text-white hover:translate-x-1">Masuk</Link>
                                <Link href="/register" className="block transition hover:text-white hover:translate-x-1">Daftar</Link>
                            </div>
                        </div>
                    </div>

                    <div className="mt-16 flex flex-col md:flex-row items-center justify-between border-t border-white/10 pt-8 text-xs font-medium text-white/40">
                        <p>© 2026 Eventify. All rights reserved.</p>
                        <div className="flex gap-6 mt-4 md:mt-0">
                            <a href="#" className="hover:text-white transition">Privacy Policy</a>
                            <a href="#" className="hover:text-white transition">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </footer>
        </main>
    );
}