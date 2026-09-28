import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, X, Loader2, Compass } from "lucide-react";
import { searchLocation } from "../services/geocodingService";

const POPULAR_CITIES = [
  { name: "Coimbatore", lat: 11.0168, lng: 76.9558 },
  { name: "Chennai", lat: 13.0827, lng: 80.2707 },
  { name: "Bangalore", lat: 12.9716, lng: 77.5946 },
  { name: "Madurai", lat: 9.9252, lng: 78.1198 },
  { name: "Kovilpatti", lat: 9.1728, lng: 77.8687 },
];

export default function MapSearch({ onSelectLocation }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchError, setSearchError] = useState("");
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search with Nominatim
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");
      try {
        const data = await searchLocation(query, abortController.signal);
        setResults(data);
        if (data.length === 0) {
          setSearchError("No location found. Try another city or area.");
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setSearchError("Location search unavailable. Please try again.");
        }
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [query]);

  const handleSelect = (item) => {
    setQuery(item.name || item.displayName);
    setShowDropdown(false);
    if (onSelectLocation) {
      onSelectLocation({
        lat: item.lat,
        lng: item.lng,
        name: item.name,
        displayName: item.displayName,
      });
    }
  };

  const handleQuickCity = (city) => {
    setQuery(city.name);
    setShowDropdown(false);
    if (onSelectLocation) {
      onSelectLocation({
        lat: city.lat,
        lng: city.lng,
        name: city.name,
        displayName: `${city.name}, India`,
      });
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowDropdown(false);
    setSearchError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (results.length > 0) {
      handleSelect(results[0]);
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute top-4 left-4 z-[500] w-[calc(100%-6rem)] sm:w-96 max-w-full font-sans"
    >
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center bg-slate-900/95 backdrop-blur-md border border-slate-800 focus-within:border-cyan-500 rounded-2xl shadow-2xl transition">
          <div className="pl-3.5 pr-2 text-cyan-400">
            {isSearching ? (
              <Loader2 size={18} className="animate-spin text-cyan-400" />
            ) : (
              <Search size={18} />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search city, area or charging station..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 py-3 pr-8 focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </form>

      {/* Quick Search Chips */}
      <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
        {POPULAR_CITIES.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => handleQuickCity(c)}
            className="shrink-0 px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800/80 hover:border-cyan-500/40 text-[11px] font-semibold text-slate-300 hover:text-cyan-300 transition shadow cursor-pointer active:scale-95"
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Results Dropdown */}
      {showDropdown && (results.length > 0 || searchError) && (
        <div className="mt-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-[600] animate-fade-in">
          {searchError && (
            <div className="p-3 text-xs text-slate-400 text-center font-medium">
              {searchError}
            </div>
          )}

          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left p-3 hover:bg-slate-800/80 border-b border-slate-800/60 last:border-b-0 flex items-start gap-2.5 transition cursor-pointer"
            >
              <MapPin size={16} className="text-cyan-400 shrink-0 mt-0.5" />
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-slate-100 truncate">
                  {item.name}
                </span>
                <span className="block text-[11px] text-slate-400 truncate">
                  {item.displayName}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
