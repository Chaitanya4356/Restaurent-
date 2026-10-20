import crypto from 'crypto';

/**
 * Verifies the cryptographically secure signature of a Razorpay webhook.
 * 
 * STRICT RULE:
 * An order is marked 'paid' ONLY by a verified payment webhook, never by the browser.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  receivedSignature: string,
  webhookSecret: string
): boolean {
  if (!rawBody || !receivedSignature || !webhookSecret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    // Timing-safe equal check prevents timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'utf-8'),
      Buffer.from(receivedSignature, 'utf-8')
    );
  } catch (err) {
    console.error('Error verifying Razorpay webhook signature:', err);
    return false;
  }
}
