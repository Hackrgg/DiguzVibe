import React, { useState, useEffect, useCallback } from 'react';
import type { ProviderInfo } from '~/types/model';
import Cookies from 'js-cookie';

interface APIKeyManagerProps {
  provider: ProviderInfo;
  apiKey: string;
  setApiKey: (key: string) => void;
  getApiKeyLink?: string;
  labelForGetApiKey?: string;
}

// cache which stores whether the provider's API key is set via environment variable
const providerEnvKeyStatusCache: Record<string, boolean> = {};

const apiKeyMemoizeCache: { [k: string]: Record<string, string> } = {};

export function getApiKeysFromCookies() {
  const storedApiKeys = Cookies.get('apiKeys');
  let parsedKeys: Record<string, string> = {};

  if (storedApiKeys) {
    parsedKeys = apiKeyMemoizeCache[storedApiKeys];

    if (!parsedKeys) {
      parsedKeys = apiKeyMemoizeCache[storedApiKeys] = JSON.parse(storedApiKeys);
    }
  }

  return parsedKeys;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const APIKeyManager: React.FC<APIKeyManagerProps> = ({ provider, apiKey, setApiKey }) => {
  const [tempKey, setTempKey] = useState(apiKey);
  const [isEnvKeySet, setIsEnvKeySet] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedKeys = getApiKeysFromCookies();
    const savedKey = savedKeys[provider.name] || '';
    setTempKey(savedKey);
    setApiKey(savedKey);
  }, [provider.name]);

  const checkEnvApiKey = useCallback(async () => {
    if (providerEnvKeyStatusCache[provider.name] !== undefined) {
      setIsEnvKeySet(providerEnvKeyStatusCache[provider.name]);
      return;
    }

    try {
      const response = await fetch(`/api/check-env-key?provider=${encodeURIComponent(provider.name)}`);
      const data = await response.json();
      const isSet = (data as { isSet: boolean }).isSet;
      providerEnvKeyStatusCache[provider.name] = isSet;
      setIsEnvKeySet(isSet);
    } catch (error) {
      console.error('Failed to check environment API key:', error);
      setIsEnvKeySet(false);
    }
  }, [provider.name]);

  useEffect(() => {
    checkEnvApiKey();
  }, [checkEnvApiKey]);

  const handleSave = () => {
    setApiKey(tempKey);

    const currentKeys = getApiKeysFromCookies();
    Cookies.set('apiKeys', JSON.stringify({ ...currentKeys, [provider.name]: tempKey }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div className="flex flex-col gap-2 py-2 px-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-bolt-elements-textSecondary">{provider?.name} API Key</span>
        {apiKey ? (
          <span className="text-xs text-green-500 flex items-center gap-1">
            <div className="i-ph:check-circle-fill w-3.5 h-3.5" />
            Key saved
          </span>
        ) : isEnvKeySet ? (
          <span className="text-xs text-green-500 flex items-center gap-1">
            <div className="i-ph:check-circle-fill w-3.5 h-3.5" />
            Set via environment variable
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="password"
          value={tempKey}
          placeholder={isEnvKeySet ? 'Override environment key (optional)' : `Paste your ${provider?.name} API key`}
          onChange={(e) => setTempKey(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-2 text-sm rounded border border-bolt-elements-borderColor
                    bg-bolt-elements-prompt-background text-bolt-elements-textPrimary
                    focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus"
        />
        <button
          onClick={handleSave}
          disabled={!tempKey}
          className="px-3 py-2 text-xs font-medium rounded border border-bolt-elements-borderColor
                    bg-bolt-elements-button-primary-background text-bolt-elements-button-primary-text
                    hover:bg-bolt-elements-button-primary-backgroundHover disabled:opacity-40
                    disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {saved ? '✓ Saved' : 'Save Key'}
        </button>
        {provider?.getApiKeyLink && (
          <button
            onClick={() => window.open(provider?.getApiKeyLink)}
            className="px-3 py-2 text-xs font-medium rounded border border-bolt-elements-borderColor
                      bg-transparent text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary
                      hover:bg-bolt-elements-item-backgroundActive transition-colors whitespace-nowrap"
          >
            {provider?.labelForGetApiKey || 'Get API Key'}
          </button>
        )}
      </div>
    </div>
  );
};
