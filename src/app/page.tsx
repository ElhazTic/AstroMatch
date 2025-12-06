"use client";

import { useState, useEffect, useRef } from "react";
import LoadingDots from "@/components/LoadingDots";

interface AnalysisResult {
  score: number;
  shortSummary: string;
  strengths: string;
  weaknesses: string;
  advice: string;
}

/**
 * Utility function to send logs to the API with UTM passthrough.
 * UTM params are passed via URL query string to the API for server-side extraction.
 */
async function logEvent(
  type: string,
  message: string,
  payload?: Record<string, unknown>,
  utmParams?: string
): Promise<void> {
  try {
    const url = utmParams ? `/api/log?${utmParams}` : "/api/log";
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, message, payload }),
    });
  } catch (err) {
    console.error("Failed to log event:", err);
  }
}

export default function HomePage() {
  const [personA, setPersonA] = useState("");
  const [dateA, setDateA] = useState("");
  const [personB, setPersonB] = useState("");
  const [dateB, setDateB] = useState("");
  const [email, setEmail] = useState("");

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const visitLogged = useRef(false);
  const utmStringRef = useRef<string | undefined>(undefined);

  // Extract and store UTM params from URL
  const extractUTMString = (params: URLSearchParams): string | undefined => {
    const utmParams = new URLSearchParams();
    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");
    const utmContent = params.get("utm_content");
    const utmTerm = params.get("utm_term");

    if (utmSource) utmParams.set("utm_source", utmSource);
    if (utmMedium) utmParams.set("utm_medium", utmMedium);
    if (utmCampaign) utmParams.set("utm_campaign", utmCampaign);
    if (utmContent) utmParams.set("utm_content", utmContent);
    if (utmTerm) utmParams.set("utm_term", utmTerm);

    const str = utmParams.toString();
    return str || undefined;
  };

  // Log visit on page load with UTM tracking
  useEffect(() => {
    if (!visitLogged.current) {
      visitLogged.current = true;
      const params = new URLSearchParams(window.location.search);
      utmStringRef.current = extractUTMString(params);
      logEvent("visit", "Landing page loaded", undefined, utmStringRef.current);
    }
  }, []);

  // Check for URL params (success or pre-fill from landing)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Store UTM for later use (in case not already stored)
    if (!utmStringRef.current) {
      utmStringRef.current = extractUTMString(params);
    }
    
    // Check for success param
    if (params.get("success") === "1") {
      setSuccessMessage(
        "Merci pour votre achat ! Vous recevrez votre rapport par email dans quelques minutes. ✨"
      );
      // Clean URL
      window.history.replaceState({}, "", "/");
      return;
    }

    // Pre-fill form from landing page params
    const urlPersonA = params.get("personA");
    const urlDateA = params.get("dateA");
    const urlPersonB = params.get("personB");
    const urlDateB = params.get("dateB");

    if (urlPersonA && urlDateA && urlPersonB && urlDateB) {
      setPersonA(urlPersonA);
      setDateA(urlDateA);
      setPersonB(urlPersonB);
      setDateB(urlDateB);
      // Clean URL to avoid re-trigger (keep UTM in ref)
      window.history.replaceState({}, "", "/");
    }
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Validation
    if (!personA.trim() || !dateA || !personB.trim() || !dateB) {
      setError("Veuillez remplir tous les champs pour les deux personnes.");
      return;
    }

    // Log form submission (real form - will be deduplicated server-side)
    // This is the TRUE form submission that counts in KPIs and triggers Telegram
    logEvent("form", "Main form submitted", {
      personA: personA.trim(),
      dateA,
      personB: personB.trim(),
      dateB,
    }, utmStringRef.current);

    setLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personA: personA.trim(),
          dateA,
          personB: personB.trim(),
          dateB,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'analyse");
      }

      setResult(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Une erreur inattendue est survenue";
      logEvent("error", errorMessage, undefined, utmStringRef.current);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!result) return;

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      setError("Veuillez entrer une adresse email valide pour recevoir le rapport.");
      return;
    }

    // Log checkout started
    logEvent("checkout", "Checkout started", {
      email: email.trim(),
      personA: personA.trim(),
      personB: personB.trim(),
    }, utmStringRef.current);

    setError(null);
    setCheckoutLoading(true);

    try {
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          personA: personA.trim(),
          dateA,
          personB: personB.trim(),
          dateB,
          score: result.score,
          summary: result.shortSummary,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          advice: result.advice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création du paiement");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Une erreur inattendue est survenue";
      logEvent("error", errorMessage, undefined, utmStringRef.current);
      setError(errorMessage);
      setCheckoutLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-purple-300";
    return "text-orange-400";
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-purple-900/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-purple-400/40 bg-purple-500/10 px-4 py-1 text-xs font-medium uppercase tracking-wide text-purple-100 mb-6">
            🔮 AstroMatch · Analyse de compatibilité
          </span>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight mb-4">
            Votre compatibilité amoureuse{" "}
            <span className="bg-gradient-to-r from-purple-200 via-pink-200 to-amber-200 bg-clip-text text-transparent">
              révélée en 30 secondes
            </span>
          </h1>
          <p className="text-slate-300/80 text-sm md:text-base max-w-xl mx-auto">
            Entrez vos informations pour découvrir votre score de compatibilité et recevoir un rapport personnalisé.
          </p>
        </header>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-8 p-4 bg-emerald-900/30 border border-emerald-500/50 rounded-xl text-emerald-300 text-center text-sm">
            {successMessage}
          </div>
        )}

        {/* Form Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 shadow-xl shadow-purple-900/20 backdrop-blur">
          <form onSubmit={handleAnalyze} className="space-y-6">
            {/* Person A */}
            <div className="space-y-3">
              <h3 className="text-purple-100 font-semibold text-sm flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-xs text-purple-200">
                  1
                </span>
                Première personne
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200/90">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={personA}
                    onChange={(e) => setPersonA(e.target.value)}
                    placeholder="Ex : Anaïs"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200/90">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={dateA}
                    onChange={(e) => setDateA(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40 transition-all [color-scheme:dark]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Person B */}
            <div className="space-y-3">
              <h3 className="text-purple-100 font-semibold text-sm flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-xs text-purple-200">
                  2
                </span>
                Deuxième personne
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200/90">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={personB}
                    onChange={(e) => setPersonB(e.target.value)}
                    placeholder="Ex : Olivier"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40 transition-all"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-200/90">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={dateB}
                    onChange={(e) => setDateB(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40 transition-all [color-scheme:dark]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-3">
              <h3 className="text-purple-100 font-semibold text-sm flex items-center gap-2">
                <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center text-xs text-purple-200">
                  ✉
                </span>
                Votre email (pour le rapport)
              </h3>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40 transition-all"
              />
              <p className="text-slate-500 text-xs">
                Requis uniquement si vous souhaitez recevoir le rapport complet.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-purple-900/40 transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  Analyse en cours <LoadingDots />
                </span>
              ) : (
                "Voir la compatibilité ❤️"
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        {result && (
          <div className="mt-8 space-y-6 animate-fade-in">
            {/* Score Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 shadow-xl shadow-purple-900/20 text-center">
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">
                Score de compatibilité
              </p>
              <p
                className={`text-6xl md:text-7xl font-bold ${getScoreColor(
                  result.score
                )} mb-4`}
              >
                {result.score}
                <span className="text-3xl text-slate-500">/100</span>
              </p>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                {result.shortSummary}
              </p>
            </div>

            {/* Quick Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/60 p-5">
                <h4 className="text-emerald-400 font-semibold text-sm mb-2 flex items-center gap-2">
                  <span>💚</span> Points forts
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">
                  {result.strengths}
                </p>
              </div>
              <div className="rounded-2xl border border-orange-500/30 bg-slate-900/60 p-5">
                <h4 className="text-orange-400 font-semibold text-sm mb-2 flex items-center gap-2">
                  <span>⚠️</span> Points de vigilance
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">
                  {result.weaknesses}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-slate-900/90 to-slate-800/50 p-6 md:p-8">
              <div className="text-center mb-6">
                <h3 className="text-lg md:text-xl font-semibold text-white mb-2">
                  Envie d&apos;aller plus loin ?
                </h3>
                <p className="text-slate-400 text-sm">
                  Obtenez votre rapport complet avec une analyse détaillée et des
                  conseils personnalisés.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 mb-6">
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-purple-300">✓</span> Analyse complète de
                    votre compatibilité
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-300">✓</span> Forces et défis de
                    votre relation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-300">✓</span> Conseils
                    personnalisés pour l&apos;avenir
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-300">✓</span> Format PDF
                    téléchargeable
                  </li>
                </ul>
              </div>

              <div className="text-center">
                <p className="text-purple-200 text-2xl font-bold mb-4">4,90 €</p>
                <button
                  onClick={handleBuy}
                  disabled={checkoutLoading || !email}
                  className="w-full md:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-400 text-sm font-semibold text-slate-950 shadow-lg shadow-purple-900/40 transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkoutLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      Redirection <LoadingDots />
                    </span>
                  ) : (
                    "Obtenir le rapport complet 📄"
                  )}
                </button>
                {!email && (
                  <p className="text-slate-500 text-xs mt-3">
                    ⬆️ Entrez votre email ci-dessus pour pouvoir acheter le
                    rapport.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-800 pt-8">
          <div className="text-center text-slate-500 text-xs">
            <p>AstroMatch · Rapport astrologique & analyse relationnelle</p>
            <p className="mt-2">
              Ne remplace pas un avis professionnel, mais peut aider à réfléchir à
              vos relations.
            </p>
            <p className="mt-4">
              <a
                href="/landing"
                className="text-purple-300/70 hover:text-purple-300 transition-colors"
              >
                En savoir plus →
              </a>
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
