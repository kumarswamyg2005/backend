/**
 * Format price in Indian Rupees (₹)
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted price string
 */
export function formatPrice(amount) {
  if (typeof amount !== "number" || isNaN(amount)) {
    return "₹0.00";
  }
  return `₹${amount.toFixed(2)}`;
}

/**
 * Parse price string to number
 * @param {string} priceStr - Price string
 * @returns {number} - Parsed price
 */
export function parsePrice(priceStr) {
  if (typeof priceStr === "number") return priceStr;
  const cleaned = String(priceStr).replace(/[₹,\s]/g, "");
  return parseFloat(cleaned) || 0;
}

/**
 * Currency enforcement - Ensures only INR is used
 */
export function enforceCurrency() {
  // Monitor for any dollar signs or other currency symbols
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" || mutation.type === "characterData") {
        const textContent = mutation.target.textContent || "";
        if (
          textContent.includes("$") ||
          textContent.toLowerCase().includes("usd")
        ) {
          console.warn("Currency violation detected: Only INR (₹) is allowed");
        }
      }
    });
  });

  // Start observing
  if (typeof document !== "undefined") {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  return observer;
}
