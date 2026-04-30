import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { stripeConnection, updateStripeConnection, disconnectStripe } from '~/lib/stores/stripe';
import { classNames } from '~/utils/classNames';
import { Dialog, DialogRoot, DialogClose, DialogTitle, DialogButton } from '~/components/ui/Dialog';
import { toast } from 'react-toastify';

export function StripeConnection() {
  const conn = useStore(stripeConnection);
  const [isOpen, setIsOpen] = useState(false);
  const [pubKey, setPubKey] = useState(conn.publishableKey);
  const [secKey, setSecKey] = useState(conn.secretKey);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    document.addEventListener('open-stripe-connection', handler);

    return () => document.removeEventListener('open-stripe-connection', handler);
  }, []);

  const handleConnect = async () => {
    if (!pubKey || !secKey) {
      toast.error('Both keys are required');
      return;
    }

    if (!pubKey.startsWith('pk_')) {
      toast.error('Invalid publishable key — must start with pk_test_ or pk_live_');
      return;
    }

    if (!secKey.startsWith('sk_')) {
      toast.error('Invalid secret key — must start with sk_test_ or sk_live_');
      return;
    }

    const pubMode = pubKey.startsWith('pk_live_') ? 'live' : 'test';
    const secMode = secKey.startsWith('sk_live_') ? 'live' : 'test';

    if (pubMode !== secMode) {
      toast.error('Keys must be from the same mode — both test or both live');
      return;
    }

    setIsVerifying(true);

    try {
      updateStripeConnection({ publishableKey: pubKey, secretKey: secKey });
      toast.success(`Connected to Stripe (${pubMode} mode)`);
      setIsOpen(false);
    } catch {
      toast.error('Failed to save Stripe connection');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnect = () => {
    disconnectStripe();
    setPubKey('');
    setSecKey('');
    toast.success('Disconnected from Stripe');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex border border-bolt-elements-borderColor overflow-hidden mr-2 text-sm">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={classNames(
            'flex items-center p-1.5 gap-2',
            'bg-bolt-elements-item-backgroundDefault hover:bg-bolt-elements-item-backgroundActive',
            conn.isConnected
              ? 'text-[#C9A84C]'
              : 'text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary',
          )}
        >
          <img
            className="w-4 h-4"
            height="20"
            width="20"
            crossOrigin="anonymous"
            src="https://cdn.simpleicons.org/stripe"
          />
          {conn.isConnected && (
            <span className="text-xs text-[#C9A84C] font-medium">{conn.mode === 'live' ? 'Live' : 'Test'}</span>
          )}
        </button>
      </div>

      <DialogRoot open={isOpen} onOpenChange={setIsOpen}>
        {isOpen && (
          <Dialog className="max-w-[520px] p-6">
            {!conn.isConnected ? (
              <div className="space-y-4">
                <DialogTitle>
                  <img
                    className="w-5 h-5"
                    height="24"
                    width="24"
                    crossOrigin="anonymous"
                    src="https://cdn.simpleicons.org/stripe"
                  />
                  Connect Stripe
                </DialogTitle>

                <p className="text-sm text-bolt-elements-textSecondary">
                  Add your Stripe keys so generated apps automatically use your account for payments.
                </p>

                <div>
                  <label className="block text-sm text-bolt-elements-textSecondary mb-2">
                    Publishable Key{' '}
                    <span className="text-bolt-elements-textTertiary">(pk_test_... or pk_live_...)</span>
                  </label>
                  <input
                    type="text"
                    value={pubKey}
                    onChange={(e) => setPubKey(e.target.value)}
                    placeholder="pk_test_..."
                    className={classNames(
                      'w-full px-3 py-2 text-sm',
                      'bg-[#0A0A0A] dark:bg-[#0A0A0A]',
                      'border border-[rgba(255,255,255,0.12)]',
                      'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                      'focus:outline-none focus:border-[#8B2035]',
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm text-bolt-elements-textSecondary mb-2">
                    Secret Key <span className="text-bolt-elements-textTertiary">(sk_test_... or sk_live_...)</span>
                  </label>
                  <input
                    type="password"
                    value={secKey}
                    onChange={(e) => setSecKey(e.target.value)}
                    placeholder="sk_test_..."
                    className={classNames(
                      'w-full px-3 py-2 text-sm',
                      'bg-[#0A0A0A] dark:bg-[#0A0A0A]',
                      'border border-[rgba(255,255,255,0.12)]',
                      'text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary',
                      'focus:outline-none focus:border-[#8B2035]',
                    )}
                  />
                </div>

                <div className="text-xs text-bolt-elements-textTertiary bg-bolt-elements-background-depth-1 border border-bolt-elements-borderColor p-3">
                  <p className="font-medium text-bolt-elements-textSecondary mb-1">
                    Your keys are stored locally only.
                  </p>
                  They are never sent to any server — only injected into generated code running in your browser sandbox.
                  Use test keys for development.{' '}
                  <a
                    href="https://dashboard.stripe.com/apikeys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#C9A84C] hover:underline"
                  >
                    Get your keys →
                  </a>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <DialogClose asChild>
                    <DialogButton type="secondary">Cancel</DialogButton>
                  </DialogClose>
                  <button
                    onClick={handleConnect}
                    disabled={isVerifying || !pubKey || !secKey}
                    className={classNames(
                      'px-4 py-2 text-sm flex items-center gap-2',
                      'bg-[#8B2035] text-white',
                      'hover:bg-[#7A1C2D]',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  >
                    {isVerifying ? (
                      <>
                        <div className="i-ph:spinner-gap animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <div className="i-ph:plug-charging w-4 h-4" />
                        Connect
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <DialogTitle>
                  <img
                    className="w-5 h-5"
                    height="24"
                    width="24"
                    crossOrigin="anonymous"
                    src="https://cdn.simpleicons.org/stripe"
                  />
                  Stripe Connected
                </DialogTitle>

                <div className="flex items-center gap-3 p-3 bg-[#1A1A1A] border border-bolt-elements-borderColor">
                  <div
                    className={classNames(
                      'px-2 py-0.5 text-xs font-medium uppercase tracking-wider',
                      conn.mode === 'live'
                        ? 'border border-green-700 text-green-400'
                        : 'border border-[#C9A84C] text-[#C9A84C]',
                    )}
                  >
                    {conn.mode === 'live' ? 'Live mode' : 'Test mode'}
                  </div>
                  <span className="text-sm text-bolt-elements-textSecondary">
                    {conn.publishableKey.substring(0, 14)}...
                  </span>
                </div>

                <p className="text-sm text-bolt-elements-textSecondary">
                  Generated apps will automatically use your Stripe keys for payment integration.
                </p>

                <div className="flex justify-end gap-2 mt-6">
                  <DialogClose asChild>
                    <DialogButton type="secondary">Close</DialogButton>
                  </DialogClose>
                  <DialogButton type="danger" onClick={handleDisconnect}>
                    <div className="i-ph:plugs w-4 h-4" />
                    Disconnect
                  </DialogButton>
                </div>
              </div>
            )}
          </Dialog>
        )}
      </DialogRoot>
    </div>
  );
}
