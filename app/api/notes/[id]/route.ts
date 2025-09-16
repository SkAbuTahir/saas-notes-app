import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth';

const updateNoteSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(request);
    const noteId = parseInt(params.id);

    if (isNaN(noteId)) {
      return NextResponse.json(
        { error: 'Invalid note ID' },
        { status: 400 }
      );
    }

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        tenantId: user.tenantId, // Ensure tenant isolation
      },
    });

    if (!note) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(note);
  } catch (error: any) {
    if (error.message?.includes('token') || error.message?.includes('Invalid') || error.message?.includes('expired')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('GET note error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(request);
    const noteId = parseInt(params.id);
    const body = await request.json();

    if (isNaN(noteId)) {
      return NextResponse.json(
        { error: 'Invalid note ID' },
        { status: 400 }
      );
    }

    const { title, content } = updateNoteSchema.parse(body);

    // Atomic update with tenant isolation
    try {
      const updatedNote = await prisma.note.update({
        where: { 
          id: noteId,
          tenantId: user.tenantId // Ensure tenant isolation in update
        },
        data: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
        },
      });
      return NextResponse.json(updatedNote);
    } catch (dbError: any) {
      if (dbError.code === 'P2025') {
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        );
      }
      throw dbError;
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    console.error('Update note error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await authenticateRequest(request);
    const noteId = parseInt(params.id);

    if (isNaN(noteId)) {
      return NextResponse.json(
        { error: 'Invalid note ID' },
        { status: 400 }
      );
    }

    // Atomic delete with tenant isolation
    try {
      await prisma.note.delete({
        where: { 
          id: noteId,
          tenantId: user.tenantId // Ensure tenant isolation in delete
        },
      });
      return NextResponse.json({ message: 'Note deleted successfully' });
    } catch (dbError: any) {
      if (dbError.code === 'P2025') {
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        );
      }
      throw dbError;
    }
  } catch (error: any) {
    if (error.message?.includes('token') || error.message?.includes('Invalid') || error.message?.includes('expired')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.error('Delete note error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}