import crypto from 'crypto';
import { IPaymentProvider, PaymentInitiateParams, PaymentInitiateResult, PaymentWebhookVerificationResult, RefundParams, RefundResult } from './types';

export class PaystackProvider implements IPaymentProvider {
  readonly id = 'paystack' as const;
  readonly name = 'Paystack (Cards & Apple Pay)';

  private publicKey: string;
  private secretKey: string;
  private currency: string;

  constructor(config?: {
    publicKey?: string;
    secretKey?: string;
    currency?: string;
  }) {
    this.publicKey = config?.publicKey || process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_sample';
    this.secretKey = config?.secretKey ?? process.env.PAYSTACK_SECRET_KEY ?? '';
    this.currency = config?.currency || process.env.PAYSTACK_CURRENCY || 'ZAR';
  }

  isConfigured(): boolean {
    return Boolean(this.secretKey && !this.secretKey.includes('sample') && !this.secretKey.includes('placeholder'));
  }

  verifySignature(rawBody: string, signature: string): boolean {
    if (!/^[a-f0-9]{128}$/i.test(signature)) return false;
    const expected = crypto.createHmac('sha512', this.secretKey).update(rawBody).digest();
    const received = Buffer.from(signature, 'hex');
    return received.length === expected.length && crypto.timingSafeEqual(expected, received);
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
    const signature = headers['x-paystack-signature'] || '';
    const isSignatureValid = this.isConfigured() && this.verifySignature(rawBody, signature);

    const data = typeof body === 'string' ? JSON.parse(body) : body;
    const eventData = (data.data || data) as Record<string, unknown>;

    const orderReference = (eventData.reference || '') as string;
    const providerTransactionId = String(eventData.id || `PST_${Date.now()}`);
    const statusText = String(eventData.status || '').toLowerCase();
    const amountCents = Number(eventData.amount || 0);

    let status: 'SUCCESSFUL' | 'FAILED' | 'PENDING' | 'CANCELLED' = 'PENDING';
    if (statusText === 'success') {
      status = 'SUCCESSFUL';
    } else if (statusText === 'failed') {
      status = 'FAILED';
    } else if (statusText === 'abandoned') {
      status = 'CANCELLED';
    }

    return {
      isValid: isSignatureValid,
      provider: 'paystack',
      orderReference,
      providerTransactionId,
      status,
      amountCents,
      currency: this.currency,
      signatureVerified: isSignatureValid,
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
