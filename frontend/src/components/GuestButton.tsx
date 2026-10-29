'use client';

/** Starts guest mode: data stays in this browser and no request goes to the server. */
import { useRouter } from 'next/navigation';
import { enterGuest } from '@/lib/guest';

export default function GuestButton({ className = 'btn secondary' }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={() => { enterGuest(); router.push('/dashboard'); }}
    >
      Try as guest
    </button>
  );
}
