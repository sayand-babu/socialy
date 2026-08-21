import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeftIcon,
  FilterIcon,
  Loader2Icon,
  AlertCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import ListingCard from '../components/ListingCard';
import FilterSidebar from '../components/FilterSidebar';
import { fetchPublicListings } from '../app/features/ListingSlice';
import { parseNaturalLanguageSearch } from '../services/aiService';

const Marketplace = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showFilterPhone, setShowFilterPhone] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialAISearch = searchParams.get('aiSearch') || '';

  // Filter & Search State
  const [filters, setFilters] = useState({
    search: initialSearch,
    platform: [],
    maxPrice: 100000,
    minFollowers: 0,
    niche: '',
    verified: false,
    monetized: false,
  });

  // AI Smart Search State
  const [aiQuery, setAiQuery] = useState(initialAISearch);
  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [aiFilterSummary, setAiFilterSummary] = useState('');
  const hasTriggeredInitialAISearch = useRef(false);

  // Sorting & Pagination State
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const limit = 12;

  // Redux state
  const { listings = [], pagination = {}, loading, error } = useSelector(
    (state) => state.listing
  );

  // Natural Language Search Handler
  const handleAISearch = async (queryText) => {
    const q = (queryText || aiQuery || '').trim();
    if (!q) {
      toast.error('Please enter a search query (e.g. monetized tech youtube under 50k)');
      return;
    }

    try {
      setIsSearchingAI(true);
      const res = await parseNaturalLanguageSearch(q);

      if (res?.parsed) {
        const p = res.parsed;
        const newFilters = {
          search: p.search || '',
          platform: Array.isArray(p.platform) ? p.platform : [],
          maxPrice: typeof p.maxPrice === 'number' ? p.maxPrice : 100000,
          minFollowers: typeof p.minFollowers === 'number' ? p.minFollowers : 0,
          niche: p.niche || '',
          verified: Boolean(p.verified),
          monetized: Boolean(p.monetized),
        };

        setFilters(newFilters);
        setAiFilterSummary(p.summary || `Filters applied for "${q}"`);
        setPage(1);
        toast.success(`✨ AI Filters Applied: ${p.summary || 'Custom filters'}`, { icon: '🤖' });
      }
    } catch {
      toast.error('Failed to parse search with AI. Trying keyword search.');
      setFilters((prev) => ({ ...prev, search: q }));
    } finally {
      setIsSearchingAI(false);
    }
  };

  const handleClearAISearch = () => {
    setAiQuery('');
    setAiFilterSummary('');
    setFilters({
      search: '',
      platform: [],
      maxPrice: 100000,
      minFollowers: 0,
      niche: '',
      verified: false,
      monetized: false,
    });
    setPage(1);
    const params = new URLSearchParams(searchParams);
    params.delete('aiSearch');
    params.delete('search');
    setSearchParams(params, { replace: true });
    toast('Filters reset to default', { icon: '🔄' });
  };

  // Trigger initial AI search if arrived via ?aiSearch=...
  useEffect(() => {
    if (initialAISearch && !hasTriggeredInitialAISearch.current) {
      hasTriggeredInitialAISearch.current = true;
      handleAISearch(initialAISearch);
    }
  }, [initialAISearch]);

  // Fetch listings from backend whenever filters, sort, or page changes
  useEffect(() => {
    const queryPayload = {
      search: filters.search || undefined,
      platform: filters.platform.length > 0 ? filters.platform.join(',') : undefined,
      niche: filters.niche || undefined,
      maxPrice: filters.maxPrice < 100000 ? filters.maxPrice : undefined,
      minFollowers: filters.minFollowers > 0 ? filters.minFollowers : undefined,
      verified: filters.verified ? true : undefined,
      monetized: filters.monetized ? true : undefined,
      sortBy,
      page,
      limit,
    };

    dispatch(fetchPublicListings(queryPayload));
  }, [dispatch, filters, sortBy, page]);

  // Reset page to 1 whenever filters change
  const handleFiltersChange = (newFilters) => {
    setPage(1);
    setFilters(newFilters);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || (pagination.totalPages && newPage > pagination.totalPages)) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalCount = pagination.total || listings.length || 0;
  const totalPages = pagination.totalPages || 1;
  const startItem = totalCount > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, totalCount);

  return (
    <div className="px-4 sm:px-8 md:px-16 lg:px-24 xl:px-32 max-w-[1600px] mx-auto min-h-screen">
      {/* TOP NAVIGATION & CONTROLS */}
      <div className="flex items-center justify-between text-slate-500 py-5 border-b border-gray-100">
        <button
          onClick={() => {
            navigate('/');
            window.scrollTo(0, 0);
          }}
          className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-indigo-600 transition"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Home
        </button>

        {/* MOBILE FILTER BUTTON */}
        <button
          onClick={() => setShowFilterPhone(true)}
          className="flex sm:hidden items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 font-semibold text-xs rounded-lg border border-indigo-100"
        >
          <FilterIcon className="size-3.5" />
          Filters ({filters.platform.length + (filters.niche ? 1 : 0)})
        </button>
      </div>

      {/* ERROR STATE */}
      {error && !loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4 text-center max-w-md bg-red-50/50 p-8 rounded-2xl border border-red-100">
            <AlertCircle className="size-10 text-red-500" />
            <div>
              <p className="text-red-700 font-bold text-lg">Failed to load marketplace</p>
              <p className="text-gray-600 text-sm mt-1">{error}</p>
              <button
                onClick={() => dispatch(fetchPublicListings({ page, sortBy }))}
                className="mt-5 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-xl shadow-xs transition"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN MARKETPLACE LAYOUT */}
      {!error && (
        <div className="relative flex items-start gap-8 py-8">
          {/* FILTER SIDEBAR */}
          <FilterSidebar
            showFilterPhone={showFilterPhone}
            setShowFilterPhone={setShowFilterPhone}
            filters={filters}
            setFilters={handleFiltersChange}
          />

          {/* LISTINGS & TOP SORT BAR */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* TOP SEARCH BAR */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!aiQuery.trim()) {
                  handleClearAISearch();
                  return;
                }
                handleAISearch(aiQuery);
              }}
              className="mb-6"
            >
              <div className="relative flex items-center bg-white border border-gray-200 hover:border-indigo-400 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 rounded-2xl shadow-xs transition p-1.5">
                <Search className="size-4 text-gray-400 ml-3 mr-2 shrink-0" />
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Search listings by title, platform, niche, budget (e.g. monetized tech youtube under 50k)..."
                  className="w-full bg-transparent text-xs sm:text-sm text-gray-800 placeholder-gray-400 outline-none pr-3"
                />
                {aiQuery && (
                  <button
                    type="button"
                    onClick={handleClearAISearch}
                    className="p-1 text-gray-400 hover:text-gray-600 mr-2 rounded-full cursor-pointer"
                    title="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSearchingAI}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isSearchingAI ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    'Search'
                  )}
                </button>
              </div>
            </form>

            {/* RESULTS HEADER & SORT DROPDOWN */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-gray-100 mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {filters.search ? `Search results for "${filters.search}"` : 'Marketplace Listings'}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-500">
                    {totalCount > 0
                      ? `Showing ${startItem}–${endItem} of ${totalCount} verified accounts`
                      : '0 accounts found'}
                  </p>
                  {aiFilterSummary && (
                    <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs">
                      <span>{aiFilterSummary}</span>
                      <button
                        onClick={handleClearAISearch}
                        className="text-indigo-400 hover:text-indigo-700 font-bold ml-1 text-sm leading-none"
                        title="Clear filter"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SORTING SELECTOR */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                  <ArrowUpDown size={13} /> Sort by:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  className="text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-600 shadow-2xs cursor-pointer hover:border-gray-300 transition"
                >
                  <option value="newest">🆕 Recently Added</option>
                  <option value="price_asc">💵 Price: Low to High</option>
                  <option value="price_desc">💰 Price: High to Low</option>
                  <option value="followers_desc">👥 Most Followers</option>
                  <option value="engagement_desc">📈 Highest Engagement</option>
                </select>
              </div>
            </div>

            {/* LOADING SPINNER */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-28 gap-3">
                <Loader2Icon className="size-8 animate-spin text-indigo-600" />
                <p className="text-sm font-medium text-gray-500">Searching marketplace accounts...</p>
              </div>
            ) : listings.length > 0 ? (
              <>
                {/* LISTINGS GRID */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {listings.map((listing, index) => (
                    <ListingCard key={listing.id || index} listing={listing} />
                  ))}
                </div>

                {/* SERVER-SIDE PAGINATION CONTROLS */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-12 pt-6 border-t border-gray-100">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className={`inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-lg border transition ${
                        page <= 1
                          ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                          : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50 cursor-pointer shadow-2xs'
                      }`}
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>

                    {/* Numbered Page Buttons */}
                    <div className="flex items-center gap-1.5 mx-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => handlePageChange(p)}
                          className={`size-8 rounded-lg text-xs font-bold transition ${
                            p === page
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
                      className={`inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-lg border transition ${
                        page >= totalPages
                          ? 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                          : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50 cursor-pointer shadow-2xs'
                      }`}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* EMPTY STATE */
              <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50/60 rounded-2xl border border-dashed border-gray-200 p-8 mt-2">
                <div className="size-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                  <SlidersHorizontal size={24} />
                </div>
                <h3 className="text-base font-bold text-gray-800 mb-1">No matching accounts found</h3>
                <p className="text-xs text-gray-500 max-w-sm mb-5">
                  Try adjusting your search keywords, lowering the price threshold, or clearing selected filters.
                </p>
                <button
                  onClick={() =>
                    handleFiltersChange({
                      search: '',
                      platform: [],
                      maxPrice: 100000,
                      minFollowers: 0,
                      niche: '',
                      verified: false,
                      monetized: false,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 hover:text-indigo-600 border border-gray-300 font-semibold text-xs rounded-lg shadow-2xs hover:bg-gray-50 transition"
                >
                  <RefreshCw size={12} /> Reset All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;
