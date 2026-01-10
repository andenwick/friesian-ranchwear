// One-time script to remove color column from Products sheet
// Run with: node scripts/update-sheet-structure.js

require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function updateSheet() {
  console.log('Updating Products sheet structure...');

  try {
    // Get sheet info to find Products tab ID
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });

    const productsSheet = sheetInfo.data.sheets.find(s => s.properties.title === 'Products');
    if (!productsSheet) {
      console.log('Products tab not found');
      return;
    }

    const productsSheetId = productsSheet.properties.sheetId;
    console.log('Found Products sheet ID:', productsSheetId);

    // Delete column C (color column, 0-indexed = 2)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: productsSheetId,
              dimension: 'COLUMNS',
              startIndex: 2,  // Column C (0-indexed)
              endIndex: 3,
            },
          },
        }],
      },
    });

    console.log('Deleted color column');

    // Update headers to new structure
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Products!A1:D1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['name', 'price', 'imageUrl', 'active']],
      },
    });

    console.log('Updated headers: name, price, imageUrl, active');
    console.log('\nSheet structure updated successfully!');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Details:', error.response.data);
    }
  }
}

updateSheet();
