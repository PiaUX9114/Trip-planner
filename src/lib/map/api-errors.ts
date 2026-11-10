import 'server-only';
import { NextResponse } from 'next/server';
import { ProviderError } from './geoapify';

export const noStore = { 'Cache-Control': 'no-store' };

export function geoapifyUnavailable(error: unknown): NextResponse {
  if (error instanceof ProviderError && error.status === 429) {
    return NextResponse.json({ error: 'Map provider rate limit reached. Please try later.' }, { status: 429, headers: noStore });
  }
  if (error instanceof ProviderError && error.status === 400) {
    return NextResponse.json({ error: 'No driving route found for those locations.' }, { status: 422, headers: noStore });
  }
  return NextResponse.json({ error: 'Map service unavailable. Please try again later.' }, { status: 503, headers: noStore });
}

export function quotaError(value: 'allowed' | 'limited' | 'unavailable'): NextResponse | null {
  if (value === 'allowed') return null;
  if (value === 'limited') return NextResponse.json({ error: 'Map request limit reached. Please try again later.' }, { status: 429, headers: noStore });
  return NextResponse.json({ error: 'Map quota service unavailable. Contact the trip administrator.' }, { status: 503, headers: noStore });
}
