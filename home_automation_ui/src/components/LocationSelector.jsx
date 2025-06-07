import React, {useState} from "react";

export default function LocationSelector() {
    const [id, setId] = useState("");
  
    const save = () => {
      fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Number(id) })
      });
    };
  
    return (
      <div className="flex space-x-2 mb-4 p-6 text-white bg-card">
        <input
          type="number"
          value={id}
          onChange={e => setId(e.target.value)}
          placeholder="Enter city ID"
          className="p-2 rounded border bg-gray-700 text-white placeholder-gray-400 flex-grow"
        />
        <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded">
          Set Location
        </button>
      </div>
    );
  }  