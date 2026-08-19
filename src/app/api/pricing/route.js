import { NextResponse } from 'next/server';
import { getAllPlanPricing } from '@/lib/planPricing';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plans = await getAllPlanPricing();
    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error) {
    console.error('[API Pricing Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener tarifas de planes.' },
      { status: 500 }
    );
  }
}
