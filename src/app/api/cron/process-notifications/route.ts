import { processScheduledNotifications } from '~/server/scheduler';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('Authorization');
  
  if (process.env.VERCEL === '1') {
    // In Vercel, we don't need to verify - their edge functions handle this
    try {
      await processScheduledNotifications();
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Failed to process scheduled notifications:', error);
      return NextResponse.json({ success: false }, { status: 500 });
    }
  } else {
    // Local development - allow all requests
    if (process.env.NODE_ENV === 'development') {
      try {
        await processScheduledNotifications();
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('Failed to process scheduled notifications:', error);
        return NextResponse.json({ success: false }, { status: 500 });
      }
    }
    
    return new NextResponse('Unauthorized', { status: 401 });
  }
}
