// js/api.js
const API_URL = "https://open.er-api.com/v6/latest/USD";

export async function fetchExchangeRates() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    const data = await response.json();
    return data.rates;
  } catch (error) {
    console.error("Exchange rate fetch failed:", error);
    return null;
  }
}
