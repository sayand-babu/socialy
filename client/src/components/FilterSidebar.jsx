import React, { useEffect, useState } from "react";
import { X, Search, ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router-dom";

/* -------------------------------
   CONSTANTS
-------------------------------- */
const platforms = [
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitch", label: "Twitch" },
  { value: "discord", label: "Discord" },
];

const niches = [
  { value: "lifestyle", label: "Lifestyle" },
  { value: "fitness", label: "Fitness" },
  { value: "food", label: "Food" },
  { value: "travel", label: "Travel" },
  { value: "tech", label: "Technology" },
  { value: "gaming", label: "Gaming" },
  { value: "fashion", label: "Fashion" },
  { value: "beauty", label: "Beauty" },
  { value: "business", label: "Business" },
  { value: "education", label: "Education" },
  { value: "entertainment", label: "Entertainment" },
  { value: "music", label: "Music" },
  { value: "art", label: "Art" },
  { value: "sports", label: "Sports" },
  { value: "health", label: "Health" },
  { value: "finance", label: "Finance" },
];

const MAX_PRICE = 100000;
const MAX_FOLLOWERS = 1000000;
const CURRENCY = "₹";

const DEFAULT_FILTERS = {
  search: "",
  platform: [],
  maxPrice: MAX_PRICE,
  minFollowers: 0,
  niche: "",
  verified: false,
  monetized: false,
};

const FilterSidebar = ({ showFilterPhone, setShowFilterPhone ,filters, setFilters}) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const onFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  /* -------------------------------
     EXPAND / COLLAPSE
  -------------------------------- */
  const [expandedSections, setExpandedSections] = useState({
    platform: true,
    price: true,
    followers: true,
    niche: true,
    status: true,
  });

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  /* -------------------------------
     DEBOUNCED SEARCH ↔ URL
  -------------------------------- */
  const [searchInput, setSearchInput] = useState(searchParams.get("search") || filters.search || "");

  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    setSearchInput(urlSearch);
    if (filters.search !== urlSearch) {
      setFilters((prev) => ({ ...prev, search: urlSearch }));
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filters.search || "")) {
        onFiltersChange({ ...filters, search: searchInput });
        const params = new URLSearchParams(searchParams);
        if (searchInput.trim()) {
          params.set("search", searchInput.trim());
        } else {
          params.delete("search");
        }
        setSearchParams(params, { replace: true });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const onChangeSearch = (e) => {
    setSearchInput(e.target.value);
  };

  /* -------------------------------
     CLEAR FILTERS
  -------------------------------- */
  const onClearFilters = () => {
    setSearchInput("");
    setFilters(DEFAULT_FILTERS);

    // clear search from URL
    const params = new URLSearchParams(searchParams);
    params.delete("search");
    setSearchParams(params, { replace: true });
  };

  /* -------------------------------
     UI HELPERS
  -------------------------------- */
  const chevronClass = (open) =>
    `size-4 transition-all duration-300 ease-in-out ${
      open ? "rotate-180 opacity-100" : "opacity-70"
    }`;

  const sectionWrapper = (open) =>
    `overflow-hidden transition-all duration-300 ease-in-out ${
      open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
    }`;

  return (
    <div
      className={`${
        showFilterPhone ? "max-sm:fixed" : "max-sm:hidden"
      } max-sm:inset-0 z-[100] bg-white border rounded-lg shadow-sm
      h-fit sticky top-24 md:min-w-[300px]`}
    >
      {/* HEADER */}
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold text-gray-700">Filters</h3>
        <X
          onClick={() => setShowFilterPhone(false)}
          className="size-6 text-gray-500 cursor-pointer sm:hidden"
        />
      </div>

      {/* BODY */}
      <div className="p-4 space-y-6">
        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 size-4 text-gray-400" />
          <input
            type="text"
            value={filters.search}
            onChange={onChangeSearch}
            placeholder="Search listings..."
            className="w-full border rounded pl-8 pr-2 py-2"
          />
        </div>

        {/* PLATFORM */}
        <FilterSection
          title="Platform"
          open={expandedSections.platform}
          toggle={() => toggleSection("platform")}
          chevronClass={chevronClass}
          wrapperClass={sectionWrapper}
        >
          {platforms.map((p) => (
            <Checkbox
              key={p.value}
              label={p.label}
              checked={filters.platform.includes(p.value)}
              onChange={(checked) =>
                onFiltersChange({
                  ...filters,
                  platform: checked
                    ? [...filters.platform, p.value]
                    : filters.platform.filter((x) => x !== p.value),
                })
              }
            />
          ))}
        </FilterSection>

        {/* PRICE */}
        <FilterSection
          title="Price Range"
          open={expandedSections.price}
          toggle={() => toggleSection("price")}
          chevronClass={chevronClass}
          wrapperClass={sectionWrapper}
        >
          <input
            type="range"
            min="0"
            max={MAX_PRICE}
            step="100"
            value={filters.maxPrice}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                maxPrice: parseInt(e.target.value),
              })
            }
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>{CURRENCY}0</span>
            <span>
              {CURRENCY}
              {filters.maxPrice.toLocaleString()}
            </span>
          </div>
        </FilterSection>

        {/* FOLLOWERS */}
        <FilterSection
          title="Minimum Followers"
          open={expandedSections.followers}
          toggle={() => toggleSection("followers")}
          chevronClass={chevronClass}
          wrapperClass={sectionWrapper}
        >
          <input
            type="range"
            min="0"
            max={MAX_FOLLOWERS}
            step="1000"
            value={filters.minFollowers}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                minFollowers: parseInt(e.target.value),
              })
            }
            className="w-full accent-indigo-600"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>0</span>
            <span>{filters.minFollowers.toLocaleString()}+</span>
          </div>
        </FilterSection>

        {/* NICHE */}
        <FilterSection
          title="Niche"
          open={expandedSections.niche}
          toggle={() => toggleSection("niche")}
          chevronClass={chevronClass}
          wrapperClass={sectionWrapper}
        >
          <select
            value={filters.niche}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                niche: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg
            text-gray-700 outline-indigo-500"
          >
            <option value="">All niches</option>
            {niches.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
        </FilterSection>

        {/* STATUS */}
        <FilterSection
          title="Account Status"
          open={expandedSections.status}
          toggle={() => toggleSection("status")}
          chevronClass={chevronClass}
          wrapperClass={sectionWrapper}
        >
          <Checkbox
            label="Verified accounts only"
            checked={filters.verified}
            onChange={(checked) =>
              onFiltersChange({ ...filters, verified: checked })
            }
          />
          <Checkbox
            label="Monetized accounts only"
            checked={filters.monetized}
            onChange={(checked) =>
              onFiltersChange({ ...filters, monetized: checked })
            }
          />
        </FilterSection>

        {/* CLEAR / APPLY */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div
            onClick={onClearFilters}
            className="flex items-center gap-2 cursor-pointer text-gray-600
            hover:text-gray-800"
          >
            <X className="size-5" />
            <span className="text-sm">Clear filters</span>
          </div>

          <button
            onClick={() => setShowFilterPhone(false)}
            className="sm:hidden text-sm border px-3 py-1 rounded
            text-gray-700 hover:bg-gray-100"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------
   REUSABLE COMPONENTS
-------------------------------- */
const FilterSection = ({
  title,
  open,
  toggle,
  chevronClass,
  wrapperClass,
  children,
}) => (
  <div>
    <button
      onClick={toggle}
      className="flex justify-between items-center w-full mb-3"
    >
      <span className="text-sm font-medium text-gray-800">{title}</span>
      <ChevronDown className={chevronClass(open)} />
    </button>

    <div className={wrapperClass(open)}>
      <div className="space-y-3">{children}</div>
    </div>
  </div>
);

const Checkbox = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 text-sm cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="text-gray-700">{label}</span>
  </label>
);

export default FilterSidebar;
