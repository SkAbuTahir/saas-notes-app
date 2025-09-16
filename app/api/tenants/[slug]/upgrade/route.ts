import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await authenticateRequest(request);

    // Only admin users can upgrade tenants
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Verify the slug matches the user's tenant
    if (user.tenantSlug !== params.slug) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Upgrade the tenant to pro plan
    try {
      const updatedTenant = await prisma.tenant.update({
        where: { 
          slug: params.slug,
          id: user.tenantId // Ensure tenant isolation
        },
        data: { plan: 'pro' },
      });
      
      return NextResponse.json({
        message: 'Tenant upgraded to Pro plan successfully',
        tenant: {
          slug: updatedTenant.slug,
          plan: updatedTenant.plan,
        },
      });
    } catch (dbError: any) {
      if (dbError.code === 'P2025') {
        return NextResponse.json(
          { error: 'Tenant not found' },
          { status: 404 }
        );
      }
      throw dbError;
    }


  } catch (error) {
    console.error('Tenant upgrade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}