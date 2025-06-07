import { useState } from 'react';

export default function Predictions() {
  const [city, setCity] = useState('');
  const [predictions, setPredictions] = useState(null); // State to store predictions
  const [loading, setLoading] = useState(false); // State for loading indicator
  const [error, setError] = useState(null); // State for error messages
  const [hours, setHours] = useState(5);
  const [combinedInput, setCombinedInput] = useState('');

  // Handle the combined input change
  const handleCombinedInputChange = (e) => {
    setCombinedInput(e.target.value);
  };

  // Handle the prediction request
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    // 1. Parse the combinedInput string
    const inputString = combinedInput.trim();
    let currentCity = '';
    let currentHours = 5; // Default hours if not specified

    // Examples: "Kolkata", "Kolkata 6", "Kolkata, 6", "New York 10"
    const regex = /^(.*?)(?:,\s*|\s+)?(\d+)?\s*$/;
    const match = inputString.match(regex);

    if (match) {
      currentCity = match[1].trim(); // City part
      const hoursStr = match[2];     // Hours part (if exists)
      if (hoursStr) {
        currentHours = Math.max(1, parseInt(hoursStr, 10)); // Ensure positive integer
      }
    } else {
      currentCity = inputString; // Fallback: entire string is city, default hours
    }

    // Update the local state variables `city` and `hours` with parsed values
    // These are the values used in the API request body.
    setCity(currentCity);
    setHours(currentHours);

    if (!currentCity) {
      setError("Please enter a city.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/predict', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: currentCity, hours: currentHours })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Predictions received from Node.js:", data);
      setPredictions(data); 

    } catch (err) {
      console.error("Error fetching predictions:", err);
      setError(`Failed to fetch predictions: ${err.message}. Make sure both Node.js and Flask servers are running.`);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="p-6 text-white bg-card">
      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          value={combinedInput}
          onChange={handleCombinedInputChange}
          placeholder="Enter city and hours (e.g., Kolkata, 6 or London 10)"
          className="p-2 rounded border bg-gray-700 text-white placeholder-gray-400 flex-grow"
        />
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Predicting...' : 'Get Predictions'}
        </button>
      </div>

      {error && <div className="text-red-400 mb-4">{error}</div>}

      {predictions && (
        <div className="bg-gray-800 p-4 rounded-lg shadow-md max-h-96 overflow-y-auto">
          <h3 className="text-lg font-bold mb-2">Future Predictions:</h3>
          {predictions.length > 0 ? (
            <table className="min-w-full text-left text-sm text-gray-300 bg-card">
              <thead className="bg-gray-700 text-gray-100 uppercase text-xs">
                <tr>
                  <th scope="col" className="px-6 py-3">Time</th>
                  <th scope="col" className="px-6 py-3">Temp (°C)</th>
                  <th scope="col" className="px-6 py-3">Condition</th>
                  <th scope="col" className="px-6 py-3">Precip (mm)</th>
                  {/* Add more prediction fields as per your model's output */}
                </tr>
              </thead>
              <tbody>
                {predictions.map((pred, index) => (
                  <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'} border-b border-gray-600`}>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(pred.time).toLocaleString()}</td>
                    <td className="px-6 py-4">{pred.temp !== undefined ? pred.temp.toFixed(1) : 'N/A'}</td>
                    <td className="px-6 py-4">{pred.cond !== undefined ? pred.cond: 'N/A'}</td>
                    <td className="px-6 py-4">{pred.prcp !== undefined ? pred.prcp.toFixed(2) : 'N/A'}</td>
                    {/* Render other fields here */}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No predictions available.</p>
          )}
        </div>
      )}
    </div>
  );
}