import { NextResponse } from 'next/server';
import { getSectorData } from '../../../../lib/sectorData';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { scores, anomalies, source } = await getSectorData();
  return NextResponse.json({ scores, anomalies, source });
}
