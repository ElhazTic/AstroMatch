"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Background effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-red-500/20 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl backdrop-blur">
          <div className="mb-6">
            <span className="text-5xl">😵</span>
          </div>
          
          <h1 className="text-2xl font-semibold text-white mb-3">
            Oups, une erreur est survenue
          </h1>
          
          <p className="text-slate-400 text-sm mb-6">
            Quelque chose s&apos;est mal passé. Pas de panique, vous pouvez réessayer !
          </p>

          <button
            onClick={reset}
            className="w-full rounded-xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-purple-900/40 transition hover:brightness-110"
          >
            Réessayer 🔄
          </button>

          <a
            href="/"
            className="inline-block mt-4 text-purple-300/70 hover:text-purple-300 transition-colors text-sm"
          >
            ← Retour à l&apos;accueil
          </a>
        </div>
      </div>
    </main>
  );
}

