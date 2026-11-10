'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Light development sync; no external Realtime subscription is required. */
export default function TripAutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [router]);
  return (
    <button type="button" onClick={() => router.refresh()}
      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      title="Changes from other travelers refresh about every 45 seconds while this tab is visible">
      Refresh shared updates
    </button>
  );
}
