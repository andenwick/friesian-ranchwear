import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSheetData } from '@/lib/sheets';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await getSheetData();

    // Skip header row if present, map to objects
    const emails = data
      .slice(1) // Skip header
      .map((row, index) => ({
        id: index + 1,
        email: row[0] || '',
        timestamp: row[1] || '',
      }))
      .filter(item => item.email) // Only include rows with email
      .reverse(); // Most recent first

    return NextResponse.json({ emails, total: emails.length });
  } catch (error) {
    console.error('Failed to fetch emails:', error);
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}
