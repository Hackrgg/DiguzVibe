# DIGUZ Vibe Coder — Dev Notes

## Session: April 30 2025

### What was built / changed

---

#### 1. Removed DevTools auto-open (`electron/main/ui/window.ts`)

The Electron window was opening Chrome DevTools on every launch in dev mode. Removed that block — app now opens clean.

---

#### 2. Header branding (`app/components/header/Header.tsx`)

The logo used to show "back to diguz.com" on hover and link away. Replaced it with a static DIGUZ VIBE CODER lockup that always shows the brand and never navigates away. Removed the hover state entirely.

---

#### 3. API key prompt UX (`app/components/chat/APIKeyManager.tsx`)

The "Not Set" state used to show a red error label. Changed it to a neutral grey "Click to insert your API key" prompt with a key icon — less alarming, more inviting.

---

#### 4. Sidebar retheme (`app/components/sidebar/Menu.client.tsx`)

The sidebar was using bolt.diy's default dark/grey palette. Rethemed to match the Diguz design:

- Background: cream `#f6eff3`
- Borders: dark brown `rgba(44,35,28,0.9)`
- New Chat button: pink `#e97ab2`
- Category date headers: gold `#C9A84C`
- Font: Sora throughout
- Fixed UnoCSS icon classes that weren't rendering (split dynamic class strings into static branches so UnoCSS can scan them at build time)

---

#### 5. Build / Plan mode toggle (`app/components/chat/BaseChat.tsx`)

Added a BUILD | PLAN toggle on the home screen (above the chat input, only shown before a chat starts). BUILD = normal code generation mode. PLAN = discuss/brainstorm mode with no code output.

When the user is in PLAN mode and has been chatting, an **"Implement this Plan"** button appears above the input. Clicking it:

- Switches mode to BUILD
- Auto-sends a message telling the AI to implement everything discussed

---

#### 6. API key guard before send (`app/components/chat/Chat.client.tsx`)

Added a check at the top of `sendMessage`: if the selected provider needs an API key and none is set, the message is blocked and a toast is shown pointing the user to the key input. Local providers (Ollama, LMStudio, OpenAILike) bypass this check since they don't need keys.

Same guard runs when the user clicks "Implement this Plan".

---

#### 7. Settings gear in chat toolbar (`app/components/chat/ChatBox.tsx`)

Settings were buried in the sidebar and not accessible during a chat. Added a gear icon button to the left side of the chat toolbar (next to the MCP icon). Clicking it opens the full Settings panel as a modal from inside the chat — no need to go back to the sidebar.

---

#### 8. MCP Server Presets gallery (`app/components/@settings/tabs/mcp/McpTab.tsx`)

Added a collapsible **Server Presets** section at the top of the MCP settings tab. 10 pre-configured servers in three tiers:

| Tier              | Servers                                                           |
| ----------------- | ----------------------------------------------------------------- |
| Free / no API key | Context7, Playwright, Chrome DevTools, Filesystem, Shell/Terminal |
| Requires API key  | Netlify, Neon Postgres, Convex, Browserbase                       |
| PC Control        | computer-use-mcp                                                  |

Clicking **+ Add** merges the server config into the JSON editor (with placeholder values for anything that needs a key). Duplicate detection warns instead of overwriting. User edits placeholders → Save → server is live.

**PC Control note:** `computer-use-mcp` gives the AI full mouse, keyboard, and screenshot access to the desktop. Combined with the Shell and Filesystem servers, this is essentially a Claude Code-style agentic setup. Only enable when you're actively supervising.

---

### Codebase fixes

- Fixed CRLF line ending issue across the entire `app/` directory (Windows git was checking out CRLF; ran prettier to normalize everything to LF so the ESLint pre-commit hook passes)
- Removed unused imports (`useState` in Header, `useCallback` in BaseChat, `HelpButton` in Menu) that were blocking lint

---

### Architecture notes

- **Storage**: API keys → browser cookies. Chat history → IndexedDB. Profile/settings → localStorage. Nothing goes to a server or requires sign-in.
- **MCP servers**: Configs live in localStorage under `mcp_settings`. The Remix API route (`/api/mcp-update-config`) picks them up and the MCPService spawns stdio/HTTP clients. Tools are passed directly to the LLM on each chat request.
- **Local LLM providers**: Ollama, LMStudio, OpenAILike are detected by name in `LOCAL_PROVIDERS` — they skip the API key check.
- **Chat modes**: `discuss` = PLAN mode (no code generation system prompt). `build` = normal BUILD mode. The toggle and "Implement" button are wired to the existing `chatMode` store.
