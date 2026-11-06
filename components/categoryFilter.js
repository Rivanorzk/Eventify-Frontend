import { Sparkles, Tag } from "lucide-react";

export default function CategoryFilter({
  categories = [],
  activeCategory = "All",
  onChange,
}) {
  return (
    <section className="mt-8 text-black">

      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        <button
          type="button"
          onClick={() => onChange?.("All")}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition ${
            activeCategory === "All"
              ? "bg-[#5B0F18] text-[#F8F1E7] border-[#5B0F18]"
              : "bg-white text-[#5B0F18] border-[#E5D6D0] hover:border-[#D8A7A7]"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          All
        </button>

        {categories.map((category) => {
          const Icon =
            typeof category.icon === "function"
              ? category.icon
              : Tag;

          // Debug: lihat nilai yang dikirim
          const isActive = String(activeCategory) === String(category.id);
          console.log('Category button:', {
            id: category.id,
            name: category.category_name,
            activeCategory: activeCategory,
            isActive: isActive
          });

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                console.log('Selected category ID:', category.id);
                onChange?.(category.id);
              }}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition ${
                isActive
                  ? "bg-[#5B0F18] text-[#F8F1E7] border-[#5B0F18]"
                  : "bg-white text-[#5B0F18] border-[#E5D6D0] hover:border-[#D8A7A7]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {category.category_name}
            </button>
          );
        })}
      </div>
    </section>
  );
}