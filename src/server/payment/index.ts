import { PaymentProvider } from '../../types';
import { IPaymentProvider } from './types';
import { PayFastProvider } from './payfast';
import { PayflexProvider } from './payflex';
import { OzowProvider } from './ozow';
import { PaystackProvider } from './paystack';
import { CryptoPaymentProvider } from './crypto';

const providers: Record<PaymentProvider, IPaymentProvider> = {
  payfast: new PayFastProvider(),
  payflex: new PayflexProvider(),
  ozow: new OzowProvider(),
  paystack: new PaystackProvider(),
  crypto: new CryptoPaymentProvider(),
};

export function getPaymentProvider(id: PaymentProvider): IPaymentProvider {
  const provider = providers[id];
  if (!provider) {
    throw new Error(`Unsupported payment provider: ${id}`);
  }
  return provider;
}

export function getAllPaymentProviders(): IPaymentProvider[] {
  return Object.values(providers);
}

export * from './types';
