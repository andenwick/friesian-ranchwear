import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function appendToSheet(values) {
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Emails!A:C',
    // Subscriber input must remain literal text. USER_ENTERED can interpret
    // attacker-controlled values as spreadsheet formulas.
    valueInputOption: 'RAW',
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

