import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

const createNoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const { title, content } = createNoteSchema.parse(body);

    // Atomic quota check and note creation using transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get tenant info and count notes
      const tenant = await tx.tenant.findUnique({
        where: { id: user.tenantId },
        select: { plan: true },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const noteCount = await tx.note.count({
        where: { tenantId: user.tenantId },
      });

      // Check quota for free plan
      if (tenant.plan === 'free' && noteCount >= 3) {
        const error = new Error('Note limit reached');
        (error as any).code = 'NOTE_LIMIT_REACHED';
        throw error;
      }

      // Create the note
      return await tx.note.create({
        data: {
          title,
          content: content || '',
          tenantId: user.tenantId,
          createdBy: user.userId,
        },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.code === 'NOTE_LIMIT_REACHED') {
      return NextResponse.json(
        {
          error: 'note_limit_reached',
          message: 'Tenant has reached the note limit for Free plan',
        },
        { status: 403 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    console.error('Create note error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    const notes = await prisma.note.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notes);
  } catch (error: any) {
    if (error.message?.includes('token') || error.message?.includes('Invalid') || error.message?.includes('expired')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET notes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}