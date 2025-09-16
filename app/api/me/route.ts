import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    
    // Return user info without sensitive data
    return NextResponse.json({
      userId: user.userId,
      email: user.email,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
      role: user.role,
    });
  } catch (error: any) {
    if (error.message?.includes('token') || error.message?.includes('Invalid') || error.message?.includes('expired')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Get user info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}