import { NextResponse } from 'next/server';
import { DenoClient } from '~/lib/deno-client';

interface ProcessNotificationsResponse {
  success: boolean;
  processed: number;
  failed: number;
  timestamp: string;
}

export async function POST() {
  try {
    const result = await DenoClient.processNotifications() as ProcessNotificationsResponse;
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to process notifications:', error);
    return NextResponse.json(
      { error: 'Failed to process notifications' },
      { status: 500 }
    );
  }
}
