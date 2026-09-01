import React, { useState, useEffect } from "react";
import { getStations } from "../utils/storage";
import StationCard from "../components/StationCard";
import { FiSearch, FiFilter, FiMapPin, FiZap, FiRefreshCw } from "react-icons/fi";

function Stations() {
  const [stations, setStations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [chargingTypeFilter, setChargingTypeFilter] = useState("ALL");
  const [connectorFilter, setConnectorFilter] = useState("ALL");
  const [maxDistance, setMaxDistance] = useState("15");

  useEffect(() => {
    setStations(getStations());
  }, []);

  const filteredStations = stations.filter((station) => {
    // Search query
    const matchesSearch =
      station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.id.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus =
      statusFilter === "ALL" || station.status.toUpperCase() === statusFilter.toUpperCase();

    // Charging type
    const matchesType =
      chargingTypeFilter === "ALL" ||
      (chargingTypeFilter === "DC" && station.dcAvailable) ||
      (chargingTypeFilter === "AC" && station.acAvailable);

    // Connector
    const matchesConnector =
      connectorFilter === "ALL" ||
      station.connectors.some(
        (c) => c.toLowerCase() === connectorFilter.toLowerCase()
      );

    // Distance
    const matchesDistance =
      parseFloat(station.distanceKm || station.distance) <= parseFloat(maxDistance);

    return (
      matchesSearch &&
      matchesStatus &&
      matchesType &&
      matchesConnector &&
      matchesDistance
    );
  });

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setChargingTypeFilter("ALL");
    setConnectorFilter("ALL");
    setMaxDistance("15");
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            EV Charging Stations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Find, filter, and book available EV charging slots near you
          </p>
        </div>

        <button
          onClick={resetFilters}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
        >
          <FiRefreshCw size={14} />
          <span>Reset Filters</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="relative">
          <FiSearch className="absolute left-4 top-3.5 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by station name, ID, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-emerald-500 focus:outline-none text-xs text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Status Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Station Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="Available">Available Only</option>
              <option value="Busy">Busy</option>
              <option value="Maintenance">Under Maintenance</option>
            </select>
          </div>

          {/* Charging Speed */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Charging Speed
            </label>
            <select
              value={chargingTypeFilter}
              onChange={(e) => setChargingTypeFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="ALL">All Speeds (AC & DC)</option>
              <option value="DC">DC Fast Charging</option>
              <option value="AC">AC Charging</option>
            </select>
          </div>

          {/* Connector Type */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Connector Type
            </label>
            <select
              value={connectorFilter}
              onChange={(e) => setConnectorFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="ALL">All Connectors</option>
              <option value="CCS">CCS</option>
              <option value="Type 2">Type 2</option>
              <option value="CHAdeMO">CHAdeMO</option>
            </select>
          </div>

          {/* Distance Slider */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex justify-between">
              <span>Max Distance</span>
              <span className="text-emerald-500 font-bold">{maxDistance} km</span>
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={maxDistance}
              onChange={(e) => setMaxDistance(e.target.value)}
              className="w-full accent-emerald-500 cursor-pointer mt-2"
            />
          </div>
        </div>
      </div>

      {/* Stations Grid */}
      {filteredStations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStations.map((station) => (
            <StationCard key={station.id} station={station} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <FiMapPin className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
            No charging stations found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try expanding your search query or resetting your distance and connector filters.
          </p>
          <button
            onClick={resetFilters}
            className="mt-4 py-2.5 px-5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Reset Search Filters
          </button>
        </div>
      )}
    </div>
  );
}

export default Stations;
