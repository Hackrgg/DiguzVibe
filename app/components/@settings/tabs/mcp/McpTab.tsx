import { useEffect, useMemo, useState } from 'react';
import { classNames } from '~/utils/classNames';
import type { MCPConfig } from '~/lib/services/mcpService';
import { toast } from 'react-toastify';
import { useMCPStore } from '~/lib/stores/mcp';
import McpServerList from '~/components/@settings/tabs/mcp/McpServerList';

const EXAMPLE_MCP_CONFIG: MCPConfig = {
  mcpServers: {
    everything: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-everything'],
    },
    deepwiki: {
      type: 'streamable-http',
      url: 'https://mcp.deepwiki.com/mcp',
    },
    'local-sse': {
      type: 'sse',
      url: 'http://localhost:8000/sse',
      headers: {
        Authorization: 'Bearer mytoken123',
      },
    },
  },
};

interface PresetServer {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: 'free' | 'api-key' | 'pc-control';
  config: Record<string, unknown>;
}

const PRESET_SERVERS: PresetServer[] = [
  {
    key: 'context7',
    name: 'Context7',
    description: 'Injects real-time library docs into prompts — no more hallucinated APIs.',
    icon: 'i-ph:book-open-text',
    category: 'free',
    config: { type: 'stdio', command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
  },
  {
    key: 'playwright',
    name: 'Playwright',
    description: 'Browser automation via Microsoft Playwright — click, fill, navigate web pages.',
    icon: 'i-ph:globe',
    category: 'free',
    config: { type: 'stdio', command: 'npx', args: ['-y', '@playwright/mcp@latest'] },
  },
  {
    key: 'chrome-devtools',
    name: 'Chrome DevTools',
    description: 'Connect to a live Chrome tab for debugging, network inspection, Puppeteer automation.',
    icon: 'i-ph:detective',
    category: 'free',
    config: { type: 'stdio', command: 'npx', args: ['-y', 'chrome-devtools-mcp@latest'] },
  },
  {
    key: 'filesystem',
    name: 'Filesystem',
    description: 'Read/write local files in allowed directories. Add your project folders as args.',
    icon: 'i-ph:folder-open',
    category: 'free',
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', 'C:/Users/YOUR_NAME/Desktop'],
    },
  },
  {
    key: 'shell',
    name: 'Shell / Terminal',
    description: 'Run terminal commands. Set ALLOWED_COMMANDS env var to restrict what can run.',
    icon: 'i-ph:terminal',
    category: 'free',
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'shell-command-mcp'],
      env: { ALLOWED_COMMANDS: 'git,node,npm,pnpm,ls,cat,echo' },
    },
  },
  {
    key: 'netlify',
    name: 'Netlify',
    description: 'Deploy sites, manage builds, and control Netlify projects via AI.',
    icon: 'i-ph:cloud-arrow-up',
    category: 'api-key',
    config: { type: 'stdio', command: 'npx', args: ['-y', '@netlify/mcp'] },
  },
  {
    key: 'neon',
    name: 'Neon (Postgres)',
    description: 'Manage Neon serverless Postgres — run SQL, create branches, manage projects.',
    icon: 'i-ph:database',
    category: 'api-key',
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@neondatabase/mcp-server-neon', 'start', 'YOUR_NEON_API_KEY'],
    },
  },
  {
    key: 'convex',
    name: 'Convex',
    description: 'Query, mutate, and manage your Convex backend database.',
    icon: 'i-ph:lightning',
    category: 'api-key',
    config: { type: 'stdio', command: 'npx', args: ['-y', 'convex@latest', 'mcp', 'start'] },
  },
  {
    key: 'browserbase',
    name: 'Browserbase',
    description: 'Cloud headless browser sessions for scraping and automation at scale.',
    icon: 'i-ph:browser',
    category: 'api-key',
    config: {
      type: 'stdio',
      command: 'npx',
      args: ['@browserbasehq/mcp'],
      env: {
        BROWSERBASE_API_KEY: 'YOUR_BROWSERBASE_API_KEY',
        BROWSERBASE_PROJECT_ID: 'YOUR_PROJECT_ID',
        GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY',
      },
    },
  },
  {
    key: 'computer-use',
    name: 'Computer Use',
    description: 'Full PC control — mouse clicks, keyboard input, and screenshots. USE WITH CARE.',
    icon: 'i-ph:monitor',
    category: 'pc-control',
    config: { type: 'stdio', command: 'npx', args: ['-y', 'computer-use-mcp'] },
  },
];

export default function McpTab() {
  const settings = useMCPStore((state) => state.settings);
  const isInitialized = useMCPStore((state) => state.isInitialized);
  const serverTools = useMCPStore((state) => state.serverTools);
  const initialize = useMCPStore((state) => state.initialize);
  const updateSettings = useMCPStore((state) => state.updateSettings);
  const checkServersAvailabilities = useMCPStore((state) => state.checkServersAvailabilities);

  const [isSaving, setIsSaving] = useState(false);
  const [mcpConfigText, setMCPConfigText] = useState('');
  const [maxLLMSteps, setMaxLLMSteps] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingServers, setIsCheckingServers] = useState(false);
  const [expandedServer, setExpandedServer] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      initialize().catch((err) => {
        setError(`Failed to initialize MCP settings: ${err instanceof Error ? err.message : String(err)}`);
        toast.error('Failed to load MCP configuration');
      });
    }
  }, [isInitialized]);

  useEffect(() => {
    setMCPConfigText(JSON.stringify(settings.mcpConfig, null, 2));
    setMaxLLMSteps(settings.maxLLMSteps);
    setError(null);
  }, [settings]);

  const parsedConfig = useMemo(() => {
    try {
      setError(null);
      return JSON.parse(mcpConfigText) as MCPConfig;
    } catch (e) {
      setError(`Invalid JSON format: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }, [mcpConfigText]);

  const handleMaxLLMCallChange = (value: string) => {
    setMaxLLMSteps(parseInt(value, 10));
  };

  const handleSave = async () => {
    if (!parsedConfig) {
      return;
    }

    setIsSaving(true);

    try {
      await updateSettings({
        mcpConfig: parsedConfig,
        maxLLMSteps,
      });
      toast.success('MCP configuration saved');

      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save configuration');
      toast.error('Failed to save MCP configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadExample = () => {
    setMCPConfigText(JSON.stringify(EXAMPLE_MCP_CONFIG, null, 2));
    setError(null);
  };

  const handleAddPreset = (preset: PresetServer) => {
    try {
      const current: MCPConfig = mcpConfigText.trim() ? JSON.parse(mcpConfigText) : { mcpServers: {} };

      if (current.mcpServers[preset.key]) {
        toast.info(`${preset.name} is already in your config`);
        return;
      }

      current.mcpServers[preset.key] = preset.config as MCPConfig['mcpServers'][string];
      setMCPConfigText(JSON.stringify(current, null, 2));
      setError(null);
      toast.success(`${preset.name} added — edit placeholders then Save`);
    } catch {
      toast.error('Could not parse current config JSON');
    }
  };

  const checkServerAvailability = async () => {
    if (serverEntries.length === 0) {
      return;
    }

    setIsCheckingServers(true);
    setError(null);

    try {
      await checkServersAvailabilities();
    } catch (e) {
      setError(`Failed to check server availability: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsCheckingServers(false);
    }
  };

  const toggleServerExpanded = (serverName: string) => {
    setExpandedServer(expandedServer === serverName ? null : serverName);
  };

  const serverEntries = useMemo(() => Object.entries(serverTools), [serverTools]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <section aria-labelledby="server-status-heading">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-medium text-bolt-elements-textPrimary">MCP Servers Configured</h2>{' '}
          <button
            onClick={checkServerAvailability}
            disabled={isCheckingServers || !parsedConfig || serverEntries.length === 0}
            className={classNames(
              'px-3 py-1.5 rounded-lg text-sm',
              'bg-bolt-elements-background-depth-3 hover:bg-bolt-elements-background-depth-4',
              'text-bolt-elements-textPrimary',
              'transition-all duration-200',
              'flex items-center gap-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {isCheckingServers ? (
              <div className="i-svg-spinners:90-ring-with-bg w-3 h-3 text-bolt-elements-loader-progress animate-spin" />
            ) : (
              <div className="i-ph:arrow-counter-clockwise w-3 h-3" />
            )}
            Check availability
          </button>
        </div>
        <McpServerList
          checkingServers={isCheckingServers}
          expandedServer={expandedServer}
          serverEntries={serverEntries}
          toggleServerExpanded={toggleServerExpanded}
        />
      </section>

      <section aria-labelledby="presets-heading">
        <button
          onClick={() => setShowPresets((v) => !v)}
          className="flex items-center gap-2 w-full text-left mb-3 group"
        >
          <h2 className="text-base font-medium text-bolt-elements-textPrimary">Server Presets</h2>
          <div
            className={classNames(
              'i-ph:caret-right w-4 h-4 text-bolt-elements-textSecondary transition-transform',
              showPresets ? 'rotate-90' : '',
            )}
          />
          <span className="text-xs text-bolt-elements-textTertiary ml-1">click to add popular servers</span>
        </button>

        {showPresets && (
          <div className="space-y-4">
            {(['free', 'api-key', 'pc-control'] as const).map((cat) => {
              const items = PRESET_SERVERS.filter((s) => s.category === cat);
              const catLabel =
                cat === 'free' ? 'Free / No API Key' : cat === 'api-key' ? 'Requires API Key' : 'PC Control';
              const catColor =
                cat === 'free' ? 'text-[#67baa8]' : cat === 'api-key' ? 'text-[#e7c768]' : 'text-[#e97ab2]';

              return (
                <div key={cat}>
                  <p className={classNames('text-xs font-bold uppercase tracking-widest mb-2', catColor)}>{catLabel}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {items.map((preset) => (
                      <div
                        key={preset.key}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2"
                      >
                        <div className={classNames(preset.icon, 'w-5 h-5 shrink-0 text-bolt-elements-textSecondary')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-bolt-elements-textPrimary">{preset.name}</p>
                          <p className="text-xs text-bolt-elements-textTertiary truncate">{preset.description}</p>
                        </div>
                        <button
                          onClick={() => handleAddPreset(preset)}
                          className="shrink-0 px-3 py-1 rounded text-xs font-medium bg-bolt-elements-background-depth-4 hover:bg-bolt-elements-item-backgroundAccent text-bolt-elements-textSecondary hover:text-bolt-elements-item-contentAccent transition-colors"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {PRESET_SERVERS.some((s) => s.category === 'pc-control') && (
              <p className="text-xs text-bolt-elements-textTertiary bg-bolt-elements-background-depth-3 px-3 py-2 rounded-lg">
                ⚠ Computer Use gives the AI full mouse/keyboard control of your PC. Only enable when actively
                supervising.
              </p>
            )}
          </div>
        )}
      </section>

      <section aria-labelledby="config-section-heading">
        <h2 className="text-base font-medium text-bolt-elements-textPrimary mb-3">Configuration</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="mcp-config" className="block text-sm text-bolt-elements-textSecondary mb-2">
              Configuration JSON
            </label>
            <textarea
              id="mcp-config"
              value={mcpConfigText}
              onChange={(e) => setMCPConfigText(e.target.value)}
              className={classNames(
                'w-full px-3 py-2 rounded-lg text-sm font-mono h-72',
                'bg-[#F8F8F8] dark:bg-[#1A1A1A]',
                'border',
                error ? 'border-bolt-elements-icon-error' : 'border-[#E5E5E5] dark:border-[#333333]',
                'text-bolt-elements-textPrimary',
                'focus:outline-none focus:ring-1 focus:ring-bolt-elements-focus',
              )}
            />
          </div>
          <div>{error && <p className="mt-2 mb-2 text-sm text-bolt-elements-icon-error">{error}</p>}</div>
          <div>
            <label htmlFor="max-llm-steps" className="block text-sm text-bolt-elements-textSecondary mb-2">
              Maximum number of sequential LLM calls (steps)
            </label>
            <input
              id="max-llm-steps"
              type="number"
              placeholder="Maximum number of sequential LLM calls"
              min="1"
              max="20"
              value={maxLLMSteps}
              onChange={(e) => handleMaxLLMCallChange(e.target.value)}
              className="w-full px-3 py-2 text-bolt-elements-textPrimary text-sm rounded-lg bg-white dark:bg-bolt-elements-background-depth-4 border border-bolt-elements-borderColor dark:border-bolt-elements-borderColor-dark focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mt-2 text-sm text-bolt-elements-textSecondary">
            The MCP configuration format is identical to the one used in Claude Desktop.
            <a
              href="https://modelcontextprotocol.io/examples"
              target="_blank"
              rel="noopener noreferrer"
              className="text-bolt-elements-link hover:underline inline-flex items-center gap-1"
            >
              View example servers
              <div className="i-ph:arrow-square-out w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap justify-between gap-3 mt-6">
        <button
          onClick={handleLoadExample}
          className="px-4 py-2 rounded-lg text-sm border border-bolt-elements-borderColor
                    bg-bolt-elements-background-depth-2 text-bolt-elements-textSecondary
                    hover:bg-bolt-elements-background-depth-3"
        >
          Load Example
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving || !parsedConfig}
            aria-disabled={isSaving || !parsedConfig}
            className={classNames(
              'px-4 py-2 rounded-lg text-sm flex items-center gap-2',
              'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent',
              'hover:bg-bolt-elements-item-backgroundActive',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            <div className="i-ph:floppy-disk w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
