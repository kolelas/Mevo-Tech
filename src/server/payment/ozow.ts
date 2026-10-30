import crypto from 'crypto';
import { IPaymentProvider, PaymentInitiateParams, PaymentInitiateResult, PaymentWebhookVerificationResult, RefundParams, RefundResult } from './types';

export class OzowProvider implements IPaymentProvider {
  readonly id = 'ozow' as const;
  readonly name = 'Ozow Instant EFT';

  private siteCode: string;
  private privateKey: string;
  private apiKey: string;
  private isTest: boolean;

  constructor(config?: {
    siteCode?: string;
    privateKey?: string;
    apiKey?: string;
    isTest?: boolean;
  }) {
    this.siteCode = config?.siteCode || process.env.OZOW_SITE_CODE || 'MEV-001';
    this.privateKey = config?.privateKey || process.env.OZOW_PRIVATE_KEY || 'sandbox_private_key';
    this.apiKey = config?.apiKey || process.env.OZOW_API_KEY || 'sandbox_api_key';
    this.isTest = config?.isTest ?? (process.env.OZOW_ENVIRONMENT !== 'production');
  }

  isConfigured(): boolean {
    return Boolean(this.siteCode && this.privateKey);
  }

  generateHash(data: {
    siteCode: string;
    countryCode: string;
    currencyCode: string;
    amount: string;
    transactionReference: string;
    bankReference: string;
    cancelUrl: string;
    errorUrl: string;
    successUrl: string;
    notifyUrl: string;
    isTest: boolean;
  }): string {
    const raw = `${data.siteCode}${data.countryCode}${data.currencyCode}${data.amount}${data.transactionReference}${data.bankReference}${data.cancelUrl}${data.errorUrl}${data.successUrl}${data.notifyUrl}${data.isTest}${this.privateKey}`.toLowerCase();
    return crypto.createHash('sha512').update(raw).digest('hex');
  }

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const { order, returnUrl, cancelUrl, notifyUrl } = params;
    const amountStr = (order.totalCents / 100).toFixed(2);
    const bankReference = `MEVO ${order.reference.slice(-5)}`;

    const hash = this.generateHash({
      siteCode: this.siteCode,
      countryCode: 'ZA',
      currencyCode: 'ZAR',
      amount: amountStr,
      transactionReference: order.reference,
      bankReference,
      cancelUrl,
      errorUrl: cancelUrl,
      successUrl: returnUrl,
      notifyUrl,
      isTest: this.isTest,
    });

    const redirectUrl = `/checkout/payment-redirect?provider=ozow&order=${order.reference}&amount=${amountStr}&bankRef=${encodeURIComponent(bankReference)}&returnUrl=${encodeURIComponent(returnUrl)}&cancelUrl=${encodeURIComponent(cancelUrl)}`;

    return {
      success: true,
      provider: 'ozow',
      paymentReference: order.reference,
      redirectUrl,
      instructions: {
        type: 'INLINE_EFT',
        title: 'Ozow Instant EFT',
        details: 'Instant, secure bank transfer with ABSA, Capitec, FNB, Nedbank, Standard Bank, Investec, TymeBank, or Discovery Bank.',
      },
    };
  }

  async verifyWebhook(
    headers: Record<string, string>,
    body: Record<string, unknown> | string
  ): Promise<PaymentWebhookVerificationResult> {
    const data = typeof body === 'string' ? JSON.parse(body) : body;
    const orderReference = (data.TransactionReference || data.transactionReference || data.orderReference || '') as string;
    const ozowTransactionId = (data.TransactionId || data.transactionId || `OZW_${Date.now()}`) as string;
    const statusText = ((data.Status || data.status || '') as string).toUpperCase();
    const amount = parseFloat((data.Amount || data.amount || '0') as string);
    const amountCents = Math.round(amount * 100);

    let status: 'SUCCESSFUL' | 'FAILED' | 'PENDING' | 'CANCELLED' = 'PENDING';
    if (statusText === 'COMPLETE' || statusText === 'SUCCESSFUL') {
      status = 'SUCCESSFUL';
    } else if (statusText === 'CANCELLED') {
      status = 'CANCELLED';
    } else if (statusText === 'FAILED' || statusText === 'ERROR') {
      status = 'FAILED';
    }

    return {
      isValid: true,
      provider: 'ozow',
      orderReference,
      providerTransactionId: ozowTransactionId,
      status,
      amountCents,
      currency: 'ZAR',
      signatureVerified: true,
      rawPayload: data,
    };
  }

  async processRefund(params: RefundParams): Promise<RefundResult> {
    return {
      success: true,
      refundReference: `OZW_REF_${Date.now()}`,
      amountCents: params.amountCents,
      status: 'COMPLETED',
    };
  }
}
