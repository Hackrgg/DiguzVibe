import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';

export function Header() {
  const chat = useStore(chatStore);

  return (
    <header className="sticky top-0 z-50 border-b-2 border-[rgba(44,35,28,0.9)] bg-[rgba(246,239,227,0.95)] backdrop-blur-md">
      {/* Announce bar */}
      <div
        className="block border-b border-[rgba(44,35,28,0.15)] py-2 text-center font-mono text-[11px] uppercase tracking-[0.12em] whitespace-nowrap overflow-hidden"
        style={{ background: '#1c1712' }}
      >
        <span className="flex items-center justify-center gap-3">
          <span className="text-[#67baa8]">→</span>
          <span className="text-[#e7c768]">→</span>
          <span className="font-black tracking-[0.18em] text-[#e97ab2]">DIGUZ VIBE CODER</span>
          <span className="text-[#e7c768]">←</span>
          <span className="text-[#67baa8]">←</span>
        </span>
      </div>

      {/* Main nav bar */}
      <div className="flex items-center w-full px-5 py-3 sm:px-8 lg:px-10 relative">
        {/* Sidebar toggle */}
        <div className="flex items-center gap-3 z-logo cursor-pointer mr-4">
          <div className="i-ph:sidebar-simple-duotone text-xl text-[#70675e]" />
        </div>

        {/* Logo */}
        <a
          href="/"
          className="flex items-center gap-0 no-underline shrink-0"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          <span className="text-xl font-extrabold tracking-tight text-[#1c1712]">DIGUZ</span>
          <span className="text-2xl leading-none font-extrabold text-[#e97ab2]">.</span>
          <span className="ml-2 text-[10px] font-bold tracking-[0.2em] uppercase border border-[rgba(44,35,28,0.3)] px-2 py-0.5 text-[#70675e]">
            VIBE CODER
          </span>
        </a>

        {/* Chat title when active */}
        {chat.started && (
          <>
            <span className="flex-1 px-4 truncate text-center text-[#1c1712] font-mono text-sm">
              <ClientOnly>{() => <ChatDescription />}</ClientOnly>
            </span>
            <ClientOnly>{() => <HeaderActionButtons chatStarted={chat.started} />}</ClientOnly>
          </>
        )}
      </div>
    </header>
  );
}
