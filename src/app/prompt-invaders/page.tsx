'use client';

import dynamic from 'next/dynamic';

const PromptInvaders = dynamic(
  () => import('@/components/prompt-invaders/PromptInvaders'),
  { ssr: false }
);

export default function PromptInvadersPage() {
  return <PromptInvaders />;
}
