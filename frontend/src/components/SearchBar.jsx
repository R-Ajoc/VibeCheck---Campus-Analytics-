import { useState } from 'react';

export default function SearchBar({ onSearch, onLocationFilter }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const handleLocationChange = (e) => {
    const value = e.target.value;
    setLocation(value);
    onLocationFilter(value);
  };

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search resorts by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-5 py-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent text-gray-700 placeholder-gray-400 shadow-sm transition"
          />
          <svg
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <button
          type="submit"
          className="px-8 py-4 bg-[#004687] text-white rounded-lg font-medium hover:bg-blue-800 transition shadow-sm whitespace-nowrap"
        >
          Search
        </button>
      </form>

      <select
        value={location}
        onChange={handleLocationChange}
        className="w-full sm:w-64 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004687] focus:border-transparent text-gray-700 bg-white shadow-sm transition"
      >
        <option value="">All Locations</option>
        <option value="beach">Beach</option>
        <option value="mountain">Mountain</option>
        <option value="city">City</option>
        <option value="tropical">Tropical</option>
      </select>
    </div>
  );
}
