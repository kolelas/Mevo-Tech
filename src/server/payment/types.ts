import { Order, PaymentAttempt, PaymentProvider } from '../../types';

export interface PaymentInitiateParams {
  order: Order;
  paymentAttempt: PaymentAttempt;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export interface PaymentInitiateResult {
  success: boolean;
  provider: PaymentProvider;
  redirectUrl?: string;
  paymentReference: string;
  formData?: Record<string, string>;
  instructions?: {
    type: 'REDIRECT' | 'QR_CRYPTO' | 'INLINE_EFT';
    title: string;
    details: string;
    cryptoAddress?: string;
    cryptoAmount?: string;
    cryptoAsset?: string;
    cryptoNetwork?: string;
    expiresAt?: string;
  };
  error?: string;
}

export interface PaymentWebhookVerificationResult {
  isValid: boolean;
  provider: PaymentProvider;
  orderReference: string;
  providerTransactionId: string;
  status: 'SUCCESSFUL' | 'FAILED' | 'PENDING' | 'CANCELLED';
  amountCents: number;
  currency: string;
  signatureVerified: boolean;
  rawPayload: Record<string, unknown>;
  error?: string;
}

export interface RefundParams {
  orderReference: string;
  providerTransactionId: string;
  amountCents: number;
  reason: string;
}

export interface RefundResult {
  success: boolean;
  refundReference: string;
  amountCents: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  error?: string;
}

export interface IPaymentProvider {
  readonly id: PaymentProvider;
  readonly name: string;
  isConfigured(): boolean;
  initiatePayment(params: PaymentInitiateParams): Promise<PaymentInitiateResult>;
  verifyWebhook(headers: Record<string, string>, body: Record<string, unknown> | string): Promise<PaymentWebhookVerificationResult>;
  processRefund(params: RefundParams): Promise<RefundResult>;
}
