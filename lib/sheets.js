import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Products cache with 1-hour TTL
let productsCache = null;
let productsCacheTimestamp = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function appendToSheet(values) {
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Emails!A:C',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [values],
    },
  });

  return response.data;
}

export async function getSheetData() {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Emails!A:C',
  });

  return response.data.values || [];
}

/**
 * Fetches products from the Products sheet with caching.
 * Returns only active products (where column D = "TRUE").
 * Uses a 1-hour cache to minimize API calls.
 *
 * Sheet columns: name, price, imageUrl, active
 */
export async function getProductsFromSheet() {
  // Check if cache is valid (exists and less than 1 hour old)
  if (productsCache && productsCacheTimestamp) {
    const cacheAge = Date.now() - productsCacheTimestamp;
    if (cacheAge < CACHE_TTL_MS) {
      return productsCache;
    }
  }

  // Fetch fresh data from Google Sheets
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Products!A:D',
  });

  const rows = response.data.values || [];

  // Skip header row (row 1), parse remaining rows into product objects
  // Filter to only include rows where column D (active) equals "TRUE"
  const products = rows
    .slice(1) // Skip header row
    .map((row, index) => ({
      id: index + 2, // Row number (1-indexed, accounting for header)
      name: row[0] || '',
      price: row[1] || '',
      imageUrl: row[2] || '',
      active: row[3] || '',
    }))
    .filter((product) => product.active === 'TRUE')
    .map(({ active, ...product }) => product); // Remove active field from output

  // Update cache
  productsCache = products;
  productsCacheTimestamp = Date.now();

  return products;
}

/**
 * Clears the products cache to force a fresh fetch on next request.
 */
export function clearProductsCache() {
  productsCache = null;
  productsCacheTimestamp = null;
}
