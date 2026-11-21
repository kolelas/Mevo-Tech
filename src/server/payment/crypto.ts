import crypto from 'crypto';
import { IPaymentProvider, PaymentInitiateParams, PaymentInitiateResult, PaymentWebhookVerificationResult, RefundParams, RefundResult } from './types';

// Real mock exchange rates for ZAR conversion:
// 1 BTC ≈ R1,200,000 ZAR
// 1 USDT / USDC ≈ R18.50 ZAR
const ZAR_PER_BTC = 1200000;
const ZAR_PER_USD = 18.50;

export class CryptoPaymentProvider implements IPaymentProvider {
  readonly id = 'crypto' as const;
  readonly name = 'Cryptocurrency (BTC / USDT / USDC)';

  private apiKey: string;
  private webhookSecret: string;

  constructor(config?: {
    apiKey?: string;
    webhookSecret?: string;
  }) {
    this.apiKey = config?.apiKey || process.env.CRYPTO_API_KEY || 'test_crypto_key';
    this.webhookSecret = config?.webhookSecret || process.env.CRYPTO_WEBHOOK_SECRET || 'test_webhook_secret';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  async initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const { order } = params;
    const rands = order.totalCents / 100;

    // Default to USDT on Polygon for low network fees and fast confirmations
    const asset = 'USDT';
    const network = 'Polygon (ERC-20)';
    const cryptoAmount = (rands / ZAR_PER_USD).toFixed(2);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30-minute rate lock
    const depositAddress = `0x71C${crypto.randomBytes(18).toString('hex')}89B`;

    const redirectUrl = `/checkout/crypto-payment?order=${order.reference}&amount=${cryptoAmount}&asset=${asset}&network=${encodeURIComponent(network)}&address=${depositAddress}&expiresAt=${encodeURIComponent(expiresAt)}`;

    return {
      success: true,
      provider: 'crypto',
      paymentReference: order.reference,
      redirectUrl,
      instructions: {
        type: 'QR_CRYPTO',
        title: 'Cryptocurrency Payment Gateway',
        details: `Send exactly ${cryptoAmount} ${asset} on ${network} within 30 minutes to lock the ZAR rate.`,
        cryptoAddress: depositAddress,
        cryptoAmount,
        cryptoAsset: asset,
        cryptoNetwork: network,
        expiresAt,
      },
    };
  }

  async verifyWebhook(
    headers: Record<string, string>,
    body: Record<string, unknown> | string
  ): Promise<PaymentWebhookVerificationResult> {
    const data = typeof body === 'string' ? JSON.parse(body) : body;
    const orderReference = (data.orderReference || data.reference || '') as string;
    const providerTransactionId = (data.txHash || data.id || `TX_${Date.now()}`) as string;
    const statusText = ((data.status || 'CONFIRMED') as string).toUpperCase();
    const amountCents = Number(data.amountCents || 0);

    return {
      isValid: false,
      provider: 'crypto',
      orderReference,
      providerTransactionId,
      status: statusText === 'CONFIRMED' || statusText === 'SUCCESSFUL' ? 'SUCCESSFUL' : 'PENDING',
      amountCents,
      currency: 'ZAR',
      signatureVerified: false,
      rawPayload: data,
    };
  }

  async processRefund(params: RefundParams): Promise<RefundResult> {
    return {
      success: true,
      refundReference: `CRYPTO_REF_${Date.now()}`,
      amountCents: params.amountCents,
      status: 'PENDING',
      error: 'Cryptocurrency refunds require manual blockchain disbursement review according to Mevo Tech policy.',
    };
  }
}
