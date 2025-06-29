'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div className="text-center max-w-md">
        <h2 className="text-3xl font-bold text-red-500 mb-4">Something went wrong!</h2>
        <p className="text-white/60 mb-6">
          {error.message || 'An unexpected error occurred while loading the application.'}
        </p>
        <button
          onClick={reset}
          className="bg-green-500/20 text-green-400 px-6 py-3 rounded-lg hover:bg-green-500/30 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}