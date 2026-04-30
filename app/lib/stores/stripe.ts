import { atom } from 'nanostores';

export interface StripeConnectionState {
  publishableKey: string;
  secretKey: string;
  isConnected: boolean;
  mode: 'test' | 'live';
}

const storage =
  typeof globalThis !== 'undefined' &&
  typeof globalThis.localStorage !== 'undefined' &&
  typeof globalThis.localStorage.getItem === 'function'
    ? globalThis.localStorage
    : null;

const saved = storage ? storage.getItem('stripe_connection') : null;

const initialState: StripeConnectionState = saved
  ? JSON.parse(saved)
  : {
      publishableKey: '',
      secretKey: '',
      isConnected: false,
      mode: 'test',
    };

export const stripeConnection = atom<StripeConnectionState>(initialState);

export function updateStripeConnection(update: Partial<StripeConnectionState>) {
  const current = stripeConnection.get();
  const next = { ...current, ...update };

  // Determine mode from key prefix
  if (update.publishableKey) {
    next.mode = update.publishableKey.startsWith('pk_live_') ? 'live' : 'test';
  }

  // Connected if both keys are present
  next.isConnected = !!(next.publishableKey && next.secretKey);

  stripeConnection.set(next);

  if (next.isConnected) {
    storage?.setItem('stripe_connection', JSON.stringify(next));
  } else {
    storage?.removeItem('stripe_connection');
  }
}

export function disconnectStripe() {
  stripeConnection.set({ publishableKey: '', secretKey: '', isConnected: false, mode: 'test' });
  storage?.removeItem('stripe_connection');
}
