import { useState,useEffect } from "react";

export default function LocationSelector() {
  const [query, setQuery]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [successMsg, setSuccessMsg] = useState("");

  // Clear success message after 3s
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // 1) Fetch suggestions when user clicks “Search”
  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setSuggestions([]);
    if (!query.trim()) {
      setError("Enter a city to search");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("http://localhost:3000/api/suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: query.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || res.status);
      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch suggestions");
    } finally {
      setLoading(false);
    }
  };

  // 2) When the user picks a city, call your existing /api/location
  const handleSelect = async (item) => {
    try {
      const res = await fetch("http://localhost:3000/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id: `${item.name}`,
          lat:`${item.lat}`,
          lon:`${item.lon}`
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || res.status);

      setSuccessMsg(`Location set to ${item.name}, ${item.country}`);
      setSuggestions([]);
      setSuggestions([]);
      setQuery(`${item.name}, ${item.country}`);
      console.log(query);
      return res.json();
    } catch (err) {
      console.error(err);
      setError("Failed to set location");
    }
  };

  return (
    <div className="p-6 text-white bg-card">
      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="p-2 rounded border bg-gray-700 text-white placeholder-gray-400 flex-grow"
          placeholder="Enter city name"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>
      {error && <p className="text-red-400 mb-4">{error}</p>}
      {/* Success message */}
      {successMsg && <p className="text-green-300 mb-2">{successMsg}</p>}

      {/* 3) Suggestion dropdown */}
      {suggestions.length > 0 && (
        <ul className="w-full mt-1 bg-gray-800 rounded shadow-lg max-h-60 overflow-auto">
          {suggestions.map(item => (
            <li
              key={`${item.name}-${item.lat}-${item.lon}`}
              onClick={() => handleSelect(item)}
              className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-white"
            >
              {item.name}, {item.country}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}