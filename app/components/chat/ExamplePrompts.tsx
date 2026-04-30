import React from 'react';

const EXAMPLE_PROMPTS = [
  { text: 'Build an ecommerce store with Stripe payments and product catalog' },
  { text: 'Build a SaaS dashboard with auth, billing, and user management' },
  { text: 'Create a landing page for a mobile app with waitlist signup' },
  { text: 'Build a booking system with calendar and Stripe checkout' },
  { text: 'Create a portfolio site with dark brutalist design' },
  { text: 'Build a marketplace with listings, search, and seller profiles' },
];

export function ExamplePrompts(sendMessage?: { (event: React.UIEvent, messageInput?: string): void | undefined }) {
  return (
    <div id="examples" className="relative flex flex-col gap-9 w-full max-w-3xl mx-auto flex justify-center mt-6">
      <div
        className="flex flex-wrap justify-center gap-2"
        style={{
          animation: '.25s ease-out 0s 1 _fade-and-move-in_g2ptj_1 forwards',
        }}
      >
        {EXAMPLE_PROMPTS.map((examplePrompt, index: number) => {
          return (
            <button
              key={index}
              onClick={(event) => {
                sendMessage?.(event, examplePrompt.text);
              }}
              className="border border-bolt-elements-borderColor bg-transparent hover:border-[#8B2035] hover:text-white text-bolt-elements-textSecondary hover:bg-[rgba(139,32,53,0.1)] px-3 py-1.5 text-xs transition-all duration-150"
            >
              {examplePrompt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
