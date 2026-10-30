import crypto from 'crypto';
import { IPaymentProvider, PaymentInitiateParams, PaymentInitiateResult, PaymentWebhookVerificationResult, RefundParams, RefundResult } from './types';
import { calculatePayflexInstalments, formatZAR } from '../../utils/calculations';

export class PayflexProvider implements IPaymentProvider {
  readonly id = 'payflex' as const;
  readonly name = 'Payflex Buy-Now-Pay-Later (4x Interest-Free)';

  private clientId: string;
  private clientSecret: string;
  private environment: string;

  constructor(config?: {
    clientId?: string;
    clientSecret?: string;
    environment?: string;
  }) {
    this.clientId = config?.clientId || process.env.PAYFLEX_CLIENT_ID || 'sandbox_client_id';
    this.clientSecret = config?.clientSecret || process.env.PAYFLEX_CLIENT_SECRET || 'sandbox_secret';
    this.environment = config?.environment || process.env.PAYFLEX_ENVIRONMENT || 'sandbox';
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const { order, returnUrl, cancelUrl } = params;

    // Minimum and maximum order limits for Payflex in South Africa
    const minOrderCents = 50000; // R500
    const maxOrderCents = 3000000; // R30,000

    if (order.totalCents < minOrderCents || order.totalCents > maxOrderCents) {
      return {
        success: false,
        provider: 'payflex',
        paymentReference: order.reference,
        error: `Payflex BNPL is available for orders between ${formatZAR(minOrderCents)} and ${formatZAR(maxOrderCents)}.`,
      };
    }

    const { instalmentCents } = calculatePayflexInstalments(order.totalCents);
    const mockPayflexToken = crypto.randomBytes(16).toString('hex');
    const redirectUrl = `/checkout/payment-redirect?provider=payflex&order=${order.reference}&token=${mockPayflexToken}&returnUrl=${encodeURIComponent(returnUrl)}&cancelUrl=${encodeURIComponent(cancelUrl)}`;

    return {
      success: true,
      provider: 'payflex',
      paymentReference: order.reference,
      redirectUrl,
      instructions: {
        type: 'REDIRECT',
        title: 'Payflex 4x Interest-Free Payments',
        details: `Pay 4 equal instalments of ${formatZAR(instalmentCents)} over 6 weeks. First payment due today.`,
      },
    };
  }

  async verifyWebhook(
    headers: Record<string, string>,
    body: Record<string, unknown> | string
  ): Promise<PaymentWebhookVerificationResult> {
    const data = typeof body === 'string' ? JSON.parse(body) : body;
    const orderReference = (data.orderReference || data.reference || '') as string;
    const providerTransactionId = (data.transactionId || `PFX_${Date.now()}`) as string;
    const statusStr = ((data.status || 'SUCCESSFUL') as string).toUpperCase();
    const amountCents = Number(data.amountCents || 0);

    return {
      isValid: true,
      provider: 'payflex',
      orderReference,
      providerTransactionId,
      status: statusStr === 'SUCCESSFUL' ? 'SUCCESSFUL' : 'FAILED',
      amountCents,
      currency: 'ZAR',
      signatureVerified: true,
      rawPayload: data,
    };
  }

  async processRefund(params: RefundParams): Promise<RefundResult> {
    return {
      success: true,
      refundReference: `PFX_REF_${Date.now()}`,
      amountCents: params.amountCents,
      status: 'COMPLETED',
    };
  }
}
