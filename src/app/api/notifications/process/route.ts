import { NextResponse } from 'next/server';
import { DenoClient } from '~/lib/deno-client';

export async function POST() {
  try {
    const result = await DenoClient.processNotifications();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to process notifications:', error);
    return NextResponse.json(
      { error: 'Failed to process notifications' },
      { status: 500 }
    );
  }
}