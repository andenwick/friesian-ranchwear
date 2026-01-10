// One-time script to set up the Google Sheet structure
// Run with: node scripts/setup-sheet.js

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

async function setupSheet() {
  console.log('Setting up Google Sheet...');
  console.log('Sheet ID:', SHEET_ID);

  try {
    // Get current sheet info
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });

    console.log('Found spreadsheet:', sheetInfo.data.properties.title);
    const existingSheets = sheetInfo.data.sheets.map(s => s.properties.title);
    console.log('Existing tabs:', existingSheets);

    // Batch update requests
    const requests = [];

    // Rename Sheet1 to Emails if it exists
    const sheet1 = sheetInfo.data.sheets.find(s => s.properties.title === 'Sheet1');
    if (sheet1) {
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: sheet1.properties.sheetId,
            title: 'Emails',
          },
          fields: 'title',
        },
      });
      console.log('Will rename Sheet1 to Emails');
    }

    // Add Products tab if it doesn't exist
    if (!existingSheets.includes('Products')) {
      requests.push({
        addSheet: {
          properties: {
            title: 'Products',
          },
        },
      });
      console.log('Will create Products tab');
    }

    // Execute batch update if we have requests
    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: { requests },
      });
      console.log('Sheet structure updated');
    }

    // Add headers to Emails tab
    const emailsTab = existingSheets.includes('Emails') ? 'Emails' : (sheet1 ? 'Emails' : existingSheets[0]);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${emailsTab}!A1:C1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [['email', 'name', 'timestamp']],
      },
    });
    console.log('Added headers to Emails tab');

    // Add headers to Products tab
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Products!A1:E1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['name', 'price', 'color', 'imageUrl', 'active']],
      },
    });
    console.log('Added headers to Products tab');

    // Add sample product
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Products!A2:E2',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Classic Western Tee', '$45', '#2A2A2A', '', 'TRUE']],
      },
    });
    console.log('Added sample product');

    console.log('\nSheet setup complete!');
    console.log('- Emails tab: Ready for email signups');
    console.log('- Products tab: Has headers and 1 sample product');

  } catch (error) {
    console.error('Error setting up sheet:', error.message);
    if (error.response) {
      console.error('Details:', error.response.data);
    }
  }
}

setupSheet();
