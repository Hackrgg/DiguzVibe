# Dyad UI/UX Observations — Reference for DIGUZ Revamp

> Compiled from two batches of Dyad screenshots. Use this as the design brief when rebuilding the frontend.

---

## 1. Overall Shell / Layout

### The 3-panel structure

```
[ Icon Rail 48px ] [ Context Panel 240px ] [ Center: Chat ] [ Right Panel 280px + icon strip ]
```

- **Icon Rail (far left, always visible):** Apps, Chat, Settings, Library, Hub, Help icons. Never collapses, never hides. Active icon is highlighted with a filled background. Labels underneath each icon.
- **Context Panel (second column):** Slides out from rail based on active icon. Shows app list (under Apps), chat list (under Chat), settings nav (under Settings). Has its own header like "Your Apps" / "Recent Chats" / "Settings".
- **Center (chat):** Always the chat. Does not get replaced by preview or workbench — they live in the right panel.
- **Right Panel (icon strip + content):** 6 icon tabs stacked vertically on far right edge. Content fills the panel to the left of those icons. Panel can be toggled open/closed with a button at top of chat.

### Titlebar

- Shows current app name: `App: busy-iguana-nu...` on the left
- App tabs appear as browser-style tabs across the top (with X to close)
- Minimize / maximize / close window controls top right

---

## 2. Left Icon Rail — Navigation Items

| Icon        | Label    | What it shows                         |
| ----------- | -------- | ------------------------------------- |
| House       | Apps     | App list + search + New App button    |
| Chat bubble | Chat     | Recent chats list + search + New Chat |
| Gear        | Settings | Full settings nav panel               |
| Book        | Library  | (templates / saved)                   |
| Grid/box    | Hub      | MCP Hub (server marketplace)          |
| Question    | Help     | Help resources                        |

---

## 3. Apps Panel (Home State — No App Selected)

- Header: "Your Apps"
- Two rows: `+ New App` button, `Search Apps` search input
- Below: list of existing apps (empty state: "No apps found")
- Center area shows: **"Build a new app"** large heading
- **Import App** button (upload icon) — imports existing project
- Prompt input box centered, with example ideas below:
  - Personal Finance Dashboard / Sign Up Form / Habit Streak Tracker
  - "More ideas" rotating button
- Promo banner at bottom (for their Pro plan — we skip this)
- Top right: small link "Already have Dyad Pro? Add your key" — we adapt this to "Already have an API key? Add it here"

---

## 4. App Creation Flow

1. User types prompt in home input → hits send
2. **Full-screen loading state** replaces center content:
   - Large spinner (arc style, brand color)
   - "Building your app" bold heading
   - "We're setting up your app with AI magic. This might take a moment..." subtitle
   - No sidebar, no panels — just this screen
3. App finishes scaffolding → lands directly in chat view with the built app

---

## 5. Chat Panel (While App Is Active)

### Top bar of chat

- `+ New Chat` button (left)
- `⏱ Version 1` — version counter with history icon (clicking shows version history)
- `⊞` toggle icon (right) — shows/hides the right panel

### Chat message style

- User messages: rounded pill/bubble, right-aligned, brand accent color background
- AI messages: left-aligned, plain text + file cards

### File write cards (KEY FEATURE — we don't have this)

Each file the AI writes appears as a card in the message:

```
[ pencil icon ] globals.css                    [ Edit ] [ > ]
                src/globals.css
                Summary: Update global CSS with Shoester black and yellow theme
```

- Icon indicates file type (pencil = edit, could be others for create/delete)
- Filename bold, path below in grey
- "Edit" button — opens file directly in Code tab
- Expand arrow ">" — shows diff or full file content
- Multiple cards stack vertically per AI turn

### Progress / Task tracker (below messages, above input)

```
[ spinner ] Create main landing page with hero section  (0/4)  [ ˅ ]
```

- Collapsible — shows subtasks when expanded
- Progress fraction `(0/4)` = subtasks complete / total
- Spinner while in progress, checkmark when done

### "Channeling..." / "Distilling..." / "Crafting..." status

- AI shows a status word while thinking, with animated bars (like audio waveform)
- Timestamp: "less than a minute ago"

### Notification prompt (dismissible)

```
[ 🔔 ] Get notified about chat events.    [ Enable ]    [ × ]
```

- Appears in chat area above input, can be dismissed

### Input box

- Placeholder: "Ask Dyad to build..."
- Left: `⚒ Basic Agent` mode selector | `Model: Auto` selector | `✦ Pro` badge
- Right: mic icon, send arrow, `+` for attachments
- No separate API key input — that's in Settings

---

## 6. Right Panel — 6 Tabs (Icon Strip on Far Right Edge)

Tabs are stacked vertically as icons with labels. Active tab is highlighted.

### Preview tab

- Full iframe of the running app
- Toolbar at top: selector tool, magic wand, pencil, back, forward, refresh, `/` path input, branch/version selector, `⏻ Restart`, open in browser, screenshot
- System Messages panel at bottom: shows `[DEBUG] [vite] connected`, `[DEBUG] [dyad-screenshot] Screenshot captured successfully` etc.

### Problems tab

- Build errors, console errors — think of it as the terminal/errors view

### Code tab

- File tree + code editor (inline, not separate workbench)
- AI-modified files highlighted

### Configure tab

- **Environment Variables** section:
  - "Local" badge (stored locally, not in repo)
  - `+ Add Environment Variable` button
  - List of configured vars
  - "No environment variables configured" empty state
- **App Commands** section:
  - "Using default install and start commands"
  - `+ Configure Custom Commands` button
- `More app settings →` link

### Security tab

- (not fully visible — likely handles secrets, permissions)

### Publish tab

- Deploy to hosting (Netlify etc.)

---

## 7. Settings — Full Breakdown

### Settings Nav (second panel under Settings icon)

- General
- Workflow
- AI
- Model Providers ← most relevant
- Telemetry
- Integrations
- Agent Permissions
- Tools (MCP)
- Experiments
- Danger Zone

### General Settings page

- Theme: System / Light / Dark toggle
- Language dropdown
- Zoom level dropdown (100%)
- Auto-update toggle + Release channel (stable)
- Runtime Mode: `host` dropdown
- Node.js Path Configuration + Browse button

### Model Providers page

- **Card grid layout** — 3 columns
- Each card: Provider name + `Needs Setup` badge (or `Setup Complete`)
- Some show `🎁 Free tier available` badge (Google, OpenRouter)
- Providers shown: OpenAI, Anthropic, Google, Google Vertex AI, OpenRouter, xAI, Dyad, Azure OpenAI, AWS Bedrock, MiniMax
- Special card: `+` **Add custom provider** — "Connect to a custom LLM API endpoint"
- Clicking a card goes to detail page

### Provider Detail Page (e.g. Anthropic)

- Header: `Configure Anthropic  ● Setup Complete`
- `🔑 Manage API Keys  ↗` — purple full-width button, links to provider's key dashboard
- **API Key from Settings** section:
  - Shows current key (partially masked): `sk-ant-api03-R2YYm...`
  - "This key is currently active." in green
  - `🗑 Delete` red button
- **Update [Provider] API Key** section:
  - Text input: "Enter new Anthropic API Key here"
  - Paste icon + `Save Key` button
  - Note: "Setting a key here will override the environment variable (if set)."
- **API Key from Environment Variable** collapsible section
- **Models** section — manage which models are available from this provider

---

## 8. MCP Hub (from Batch 1 Screenshots)

- Accessible from Hub icon in rail
- Shows "Featured Servers" section at top (2-3 highlighted)
- "All MCP servers" grid below — cards with name, description, "Add to Dyad" button, "Read more" link
- Servers seen: Chrome DevTools, Context7, Amplitude, Astro docs, Auth0, Browserbase, Convex, Neon, Netlify, Playwright
- "Add to Dyad" directly installs/configures the MCP server
- This is equivalent to our MCP Presets section in Settings → MCP Servers

---

## 9. Key Features DIGUZ is Missing vs Dyad

| Feature                                           | Dyad | DIGUZ Current              | Priority |
| ------------------------------------------------- | ---- | -------------------------- | -------- |
| Permanent icon rail nav                           | ✅   | ❌ hamburger sidebar       | High     |
| Right panel always visible                        | ✅   | ❌ workbench replaces view | High     |
| Right panel tabs (Preview/Code/Configure/Publish) | ✅   | ❌ monolithic workbench    | High     |
| File write cards in chat                          | ✅   | ❌ plain text artifacts    | High     |
| App/project as unit (with name)                   | ✅   | ❌ just chat history       | Medium   |
| Version history / rollback                        | ✅   | ❌                         | Medium   |
| Task progress tracker in chat                     | ✅   | ❌                         | Medium   |
| Model providers card grid in settings             | ✅   | ❌ dropdown in chat        | Medium   |
| Provider detail page (key status, update, delete) | ✅   | ❌                         | Medium   |
| Configure tab (env vars + app commands)           | ✅   | ❌                         | Medium   |
| App creation loading screen                       | ✅   | ❌                         | Low      |
| Chat tabs (browser-style, multiple)               | ✅   | ❌                         | Low      |
| System Messages panel                             | ✅   | partial (terminal)         | Low      |
| Notification system                               | ✅   | ❌                         | Low      |

---

## 10. Design Language Observations

- **Colors:** Very light lavender/white background (`#F0EFFF` ish), purple accent (`#5B47E0` ish), white cards, grey borders
- **Typography:** Clean sans-serif, heavy weight headings, small caps labels
- **Cards:** White with subtle border radius, light shadow — no heavy styling
- **Spacing:** Generous padding, breathable layout
- **Icons:** Simple line icons throughout, filled version for active state
- **Status indicators:** Colored dots (green = active/complete, yellow = pending, grey = not set)
- **Buttons:** Rounded, filled purple for primary actions, outlined for secondary

### For DIGUZ — Keep our own brand

- Keep cream `#f6eff3` background, dark brown borders, pink `#e97ab2` accents, gold `#C9A84C`
- Keep Sora font
- But adopt Dyad's **layout structure** and **feature patterns** — just skin them in Diguz palette

---

## 11. Recommended Build Order

1. **Shell / Layout** — icon rail + context panel + right panel tabs (replaces current hamburger + workbench)
2. **Right panel** — Preview, Code, Configure tabs wired to existing workbench data
3. **File write cards** — replace artifact blocks in chat with Dyad-style file cards
4. **Model Providers settings page** — card grid + per-provider detail with key management
5. **Task progress tracker** — show subtask progress below chat input while AI is working
6. **Version history** — snapshot chat + files at each AI response
7. **App/project naming** — auto-name projects, show in titlebar
