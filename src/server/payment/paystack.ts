import crypto from 'crypto';
import { IPaymentProvider, PaymentInitiateParams, PaymentInitiateResult, PaymentWebhookVerificationResult, RefundParams, RefundResult } from './types';

const PAYSTACK_SIGNATURE_TOLERANCE_SECONDS = 300;

export class PaystackProvider implements IPaymentProvider {
  readonly id = 'paystack' as const;
  readonly name = 'Paystack (Cards & Apple Pay)';

  private publicKey: string;
  private secretKey: string;
  private webhookSecret: string;
  private currency: string;

  constructor(config?: {
    publicKey?: string;
    secretKey?: string;
    webhookSecret?: string;
    currency?: string;
  }) {
    this.publicKey = config?.publicKey || process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_sample';
    this.secretKey = config?.secretKey ?? process.env.PAYSTACK_SECRET_KEY ?? '';
    this.webhookSecret = config?.webhookSecret ?? process.env.PAYSTACK_WEBHOOK_SECRET ?? '';
    this.currency = config?.currency || process.env.PAYSTACK_CURRENCY || 'ZAR';
  }

  isConfigured(): boolean {
    return Boolean(this.secretKey && !this.secretKey.toLowerCase().includes('sample') && !this.secretKey.toLowerCase().includes('placeholder'));
  }

  isWebhookSigningSecretConfigured(): boolean {
    return this.webhookSecret.startsWith('whsec_') && this.webhookSecret.length > 6;
  }

  verifySignature(rawBody: string, signature: string): boolean {
    if (!this.isConfigured() || !/^[a-f0-9]{128}$/i.test(signature)) return false;
    const expected = crypto.createHmac('sha512', this.secretKey).update(rawBody, 'utf8').digest();
    const received = Buffer.from(signature, 'hex');
    return received.length === expected.length && crypto.timingSafeEqual(expected, received);
  }

  /**
   * Verifies Paystack's current timestamped signing-secret header.
   * Multiple v1 signatures are supported during provider-side secret rotation.
   */
  verifySigningSecretSignature(
    rawBody: string,
    header: string,
    nowSeconds: number = Math.floor(Date.now() / 1000)
  ): boolean {
    if (!this.isWebhookSigningSecretConfigured() || typeof header !== 'string' || !header) return false;

    let timestamp: number | undefined;
    const signatures: Array<{ keyId: string; hex: string }> = [];

    for (const part of header.split(',')) {
      const separator = part.indexOf('=');
      if (separator < 0) continue;
      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();

      if (key === 't') {
        if (timestamp !== undefined || !/^\d+$/.test(value)) return false;
        timestamp = Number(value);
        if (!Number.isSafeInteger(timestamp)) return false;
      } else if (key === 'v1') {
        const colon = value.indexOf(':');
        if (colon <= 0) continue;
        signatures.push({ keyId: value.slice(0, colon), hex: value.slice(colon + 1) });
      }
    }

    if (timestamp === undefined || signatures.length === 0) return false;
    if (Math.abs(nowSeconds - timestamp) > PAYSTACK_SIGNATURE_TOLERANCE_SECONDS) return false;

    const expected = crypto
      .createHmac('sha512', this.webhookSecret)
      .update(`${timestamp}.`, 'utf8')
      .update(rawBody, 'utf8')
      .digest();

    for (const entry of signatures) {
      if (!/^whk_[A-Za-z0-9_-]+$/.test(entry.keyId) || !/^[a-f0-9]{128}$/.test(entry.hex)) continue;
      const received = Buffer.from(entry.hex, 'hex');
      if (received.length === expected.length && crypto.timingSafeEqual(expected, received)) return true;
    }

    return false;
  }

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const { order, returnUrl, cancelUrl } = params;

    const redirectUrl = `/checkout/payment-redirect?provider=paystack&order=${order.reference}&amount=${(order.totalCents / 100).toFixed(2)}&returnUrl=${encodeURIComponent(returnUrl)}&cancelUrl=${encodeURIComponent(cancelUrl)}`;

    return {
      success: true,
      provider: 'paystack',
      paymentReference: order.reference,
      redirectUrl,
      instructions: {
        type: 'REDIRECT',
        title: 'Paystack Payment',
        details: 'Secure Visa, Mastercard, and Apple Pay checkout with immediate 3D-Secure authentication.',
      },
    };
  }

  async verifyWebhook(
    headers: Record<string, string>,
    body: Record<string, unknown> | string
  ): Promise<PaymentWebhookVerificationResult> {
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    const signingSecretHeader = headers['paystack-signature'] ?? headers['Paystack-Signature'];
    const legacySignature = headers['x-paystack-signature'] ?? headers['X-Paystack-Signature'] ?? '';

    // Do not fall back to the deprecated header when a current-format header is
    // present but invalid; that would permit a signature downgrade.
    const signatureVerified = signingSecretHeader !== undefined
      ? this.verifySigningSecretSignature(rawBody, signingSecretHeader)
      : this.verifySignature(rawBody, legacySignature);

    let data: Record<string, unknown>;
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid webhook JSON object');
      data = parsed as Record<string, unknown>;
    } catch {
      return {
        isValid: false,
        provider: 'paystack',
        orderReference: '',
        providerTransactionId: '',
        status: 'PENDING',
        amountCents: 0,
        currency: this.currency,
        signatureVerified: false,
        rawPayload: {},
      };
    }

    const nestedData = data.data;
    const eventData = nestedData && typeof nestedData === 'object' && !Array.isArray(nestedData)
      ? nestedData as Record<string, unknown>
      : data;

    const eventName = typeof data.event === 'string' ? data.event : '';
    const orderReference = typeof eventData.reference === 'string' ? eventData.reference : '';
    const providerTransactionId = String(eventData.id || '');
    const statusText = String(eventData.status || '').toLowerCase();
    const rawAmount = Number(eventData.amount);
    const amountCents = Number.isSafeInteger(rawAmount) && rawAmount > 0 ? rawAmount : 0;

    // Only charge events may affect an order. Other signed Paystack event
    // families (for example transfers or disputes) must not mark checkout paid.
    let status: 'SUCCESSFUL' | 'FAILED' | 'PENDING' | 'CANCELLED' = 'PENDING';
    if (eventName === 'charge.success' && statusText === 'success') status = 'SUCCESSFUL';
    else if (eventName === 'charge.failed' && statusText === 'failed') status = 'FAILED';

    return {
      isValid: signatureVerified,
      provider: 'paystack',
      orderReference,
      providerTransactionId,
      status,
      amountCents,
      currency: this.currency,
      signatureVerified,
      rawPayload: data,
    };
  }

  async processRefund(params: RefundParams): Promise<RefundResult> {
    return {
      success: true,
      refundReference: `PST_REF_${Date.now()}`,
      amountCents: params.amountCents,
      status: 'COMPLETED',
    };
  }
}
