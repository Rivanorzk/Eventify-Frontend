"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import CategoryFilter from "@/components/categoryFilter";
import EventGrid from "@/components/eventGrid";
import SectionHeader from "@/components/sectionHeader";
import LoadingSpinner from "@/components/loadingSpinner";
import EmptyState from "@/components/emptyState";

import { getEvents } from "@/services/eventService";
import { getCategories } from "@/services/categoryService";

import { useSearch } from "@/contexts/searchContext";

function CustomerEventContent() {
  const { search } = useSearch();
  const router = useRouter();
  const pathname = usePathname(); // rute halaman ini, jadi tidak perlu hardcode "/event"
  const searchParams = useSearchParams();

  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter awal diambil dari URL, contoh: /event?category=3
  const categoryParam = searchParams.get("category");
  const [activeCategory, setActiveCategory] = useState(categoryParam || "All");

  // Ikuti perubahan URL (mis. klik link kategori dari halaman detail event)
  useEffect(() => {
    setActiveCategory(categoryParam || "All");
  }, [categoryParam]);

  // Klik filter -> simpan ke URL supaya refresh / tombol back tetap di filter yang sama
  const handleCategoryChange = (value) => {
    setActiveCategory(value);
    router.replace(
      value === "All" ? pathname : `${pathname}?category=${value}`,
      { scroll: false }
    );
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [eventsResponse, categoriesResponse] = await Promise.all([
          getEvents(),
          getCategories(),
        ]);

        const eventsData = eventsResponse?.data || eventsResponse || [];
        const categoriesData =
          categoriesResponse?.data || categoriesResponse || [];

        setEvents(Array.isArray(eventsData) ? eventsData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      } catch (err) {
        console.error("Failed to load events:", err);
        setError("Gagal memuat daftar event. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredEvents = events.filter((event) => {
    if (!event.category_id) return false;

    const categoryMatch =
      activeCategory === "All" ||
      String(event.category_id) === String(activeCategory);

    const keyword = search.toLowerCase().trim();
    const searchMatch =
      !keyword ||
      (event.title?.toLowerCase() || "").includes(keyword) ||
      (event.location?.toLowerCase() || "").includes(keyword);

    return categoryMatch && searchMatch;
  });

  return (
    <div>
      <SectionHeader
        title="Explore Events"
        description="Discover and book events that match your interests"
      />

      <CategoryFilter
        categories={categories}
        activeCategory={activeCategory}
        onChange={handleCategoryChange}
      />

      <div className="mt-8">
        {loading ? (
          <LoadingSpinner text="Loading events..." />
        ) : error ? (
          <EmptyState title="Something went wrong" description={error} />
        ) : (
          <EventGrid
            events={filteredEvents}
            favorites={favorites}
            columns={4}
            onFavorite={(event) => {
              setFavorites((current) =>
                current.includes(event.id)
                  ? current.filter((id) => id !== event.id)
                  : [...current, event.id]
              );
            }}
          />
        )}
      </div>
    </div>
  );
}

// useSearchParams wajib dibungkus Suspense, kalau tidak `next build` gagal.
export default function CustomerEventPage() {
  return (
    <Suspense fallback={<LoadingSpinner text="Loading events..." />}>
      <CustomerEventContent />
    </Suspense>
  );
}