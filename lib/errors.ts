import { NextResponse } from 'next/server';

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string = 'Invalid input') {
    super(message);
    this.name = 'ValidationError';
  }
}

export function handleApiError(error: any) {
  console.error('API Error:', error);

  // Authentication errors
  if (error instanceof AuthenticationError || 
      error.message?.includes('token') || 
      error.message?.includes('Invalid') || 
      error.message?.includes('expired')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Authorization errors
  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  // Validation errors
  if (error instanceof ValidationError || error.name === 'ZodError') {
    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    );
  }

  // Prisma errors
  if (error.code === 'P2025') {
    return NextResponse.json(
      { error: 'Resource not found' },
      { status: 404 }
    );
  }

  if (error.code === 'P2002') {
    return NextResponse.json(
      { error: 'Resource already exists' },
      { status: 409 }
    );
  }

  // Default server error
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}