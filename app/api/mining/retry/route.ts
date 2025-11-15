import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { receiptsLogger } from '@/lib/storage/receipts-logger';

const API_BASE = 'https://scavenger.prod.gd.midnighttge.io';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, challengeId, nonce } = body;

    if (!address || !challengeId || !nonce) {
      return NextResponse.json(
        { error: 'Missing required fields: address, challengeId, nonce' },
        { status: 400 }
      );
    }

    // Validate 24-hour window
    // Find the original error entry
    const errors = receiptsLogger.readErrors();
    const originalError = errors.find(
      e => e.address === address &&
           e.challenge_id === challengeId &&
           e.nonce === nonce
    );

    if (!originalError) {
      return NextResponse.json(
        { error: 'Original failed solution not found' },
        { status: 404 }
      );
    }

    // Check if within 24 hours
    const errorTime = new Date(originalError.ts).getTime();
    const now = Date.now();
    const hoursSinceError = (now - errorTime) / (1000 * 60 * 60);

    if (hoursSinceError > 24) {
      return NextResponse.json(
        {
          error: 'Retry window expired',
          message: 'Solutions can only be retried within 24 hours of the original submission'
        },
        { status: 400 }
      );
    }

    // Attempt to resubmit the solution
    const submitUrl = `${API_BASE}/solution/${address}/${challengeId}/${nonce}`;

    console.log('[Retry API] Attempting to retry solution:', {
      url: submitUrl,
      originalErrorTime: originalError.ts,
      hoursSinceError: hoursSinceError.toFixed(2)
    });

    try {
      const response = await axios.post(submitUrl);

      // Log success
      receiptsLogger.logReceipt({
        ts: new Date().toISOString(),
        address,
        addressIndex: originalError.addressIndex,
        challenge_id: challengeId,
        nonce,
        hash: originalError.hash,
        crypto_receipt: response.data,
      });

      console.log('[Retry API] ✓ Solution retry successful');

      return NextResponse.json({
        success: true,
        message: 'Solution submitted successfully',
        receipt: response.data
      });

    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      const errorDetails = error.response?.data || {};

      console.error('[Retry API] ✗ Solution retry failed:', errorMsg);

      // Log the retry failure
      receiptsLogger.logError({
        ts: new Date().toISOString(),
        address,
        addressIndex: originalError.addressIndex,
        challenge_id: challengeId,
        nonce,
        hash: originalError.hash,
        error: `Retry failed: ${errorMsg}`,
        response: errorDetails,
      });

      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          details: errorDetails,
          fullError: error.response?.data || error.message
        },
        { status: error.response?.status || 500 }
      );
    }

  } catch (error: any) {
    console.error('[Retry API] Request error:', error);
    return NextResponse.json(
      { error: 'Failed to process retry request', details: error.message },
      { status: 500 }
    );
  }
}
