/**
 * Debug utility to verify filter parameters are being sent correctly
 * Open browser console and run these commands to test
 */

export function debugFilters() {
  // Check localStorage for auth token
  const token = window.localStorage.getItem("rpg_auth_token");
  console.log("[DEBUG] Auth token exists:", !!token);

  // Test a simple filter request
  const testUrl = new URL("http://127.0.0.1:8000/api/products");
  testUrl.searchParams.append("page", "1");
  testUrl.searchParams.append("search", "test");
  testUrl.searchParams.append("category_id", "1");
  testUrl.searchParams.append("brand_id", "1");
  testUrl.searchParams.append("price_min", "100");
  testUrl.searchParams.append("price_max", "500");
  testUrl.searchParams.append("currency_pricing", "EGP");

  console.log("[DEBUG] Test URL:", testUrl.toString());
  console.log("[DEBUG] URL search params:");
  testUrl.searchParams.forEach((value, key) => {
    console.log(`  ${key}=${value}`);
  });

  // Instructions for testing
  console.log(`
[DEBUG] To test the API directly:
1. Copy this URL: ${testUrl.toString()}
2. Replace with your actual token
3. Test with curl or Postman:
   curl -H "Authorization: Bearer YOUR_TOKEN" "${testUrl.toString()}"
  `);
}

// Available in window for console testing
if (typeof window !== "undefined") {
  (window as any).debugFilters = debugFilters;
}
