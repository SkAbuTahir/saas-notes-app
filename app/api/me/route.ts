import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);
    
    // Return user info without sensitive data
    return NextResponse.json({
      userId: user.userId,
      email: user.email,
      tenantId: user.tenantId,
      tenantSlug: user.tenantSlug,
      role: user.role,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}