"use client";

import { useState, useEffect } from "react";
import LoadingDots from "@/components/LoadingDots";

interface AnalysisResult {
  score: number;
  shortSummary: string;
  strengths: string;
  weaknesses: string;
  advice: string;
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

  // Check for success param in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
      setSuccessMessage(
        "Merci pour votre achat ! Vous recevrez votre rapport par email dans quelques minutes. ✨"
      );
      // Clean URL
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
      setError(
        err instanceof Error ? err.message : "Une erreur inattendue est survenue"
      );
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
      setError(
        err instanceof Error ? err.message : "Une erreur inattendue est survenue"
      );
      setCheckoutLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-amber-300";
    return "text-orange-400";
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Stars background effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-1 h-1 bg-white rounded-full opacity-60 animate-pulse" />
        <div className="absolute top-40 right-1/3 w-1.5 h-1.5 bg-amber-200 rounded-full opacity-40 animate-pulse [animation-delay:0.5s]" />
        <div className="absolute top-60 left-1/2 w-1 h-1 bg-white rounded-full opacity-50 animate-pulse [animation-delay:1s]" />
        <div className="absolute top-32 right-1/4 w-1 h-1 bg-amber-100 rounded-full opacity-30 animate-pulse [animation-delay:1.5s]" />
        <div className="absolute bottom-40 left-1/3 w-1.5 h-1.5 bg-white rounded-full opacity-40 animate-pulse [animation-delay:0.3s]" />
        <div className="absolute bottom-60 right-1/2 w-1 h-1 bg-amber-200 rounded-full opacity-50 animate-pulse [animation-delay:0.8s]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-amber-300 tracking-wide mb-4">
            ✨ AstroMatch
          </h1>
          <p className="text-slate-300 text-lg">
            Analyse de compatibilité amoureuse générée par IA en 30 secondes.
          </p>
        </header>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-8 p-4 bg-green-900/30 border border-green-500/50 rounded-xl text-green-300 text-center">
            {successMessage}
          </div>
        )}

        {/* Form Card */}
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6 md:p-8 shadow-xl shadow-slate-950/50 backdrop-blur-sm">
          <form onSubmit={handleAnalyze} className="space-y-8">
            {/* Person A */}
            <div className="space-y-4">
              <h3 className="text-amber-300 font-semibold text-lg flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-300/20 rounded-full flex items-center justify-center text-sm">
                  1
                </span>
                Première personne
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={personA}
                    onChange={(e) => setPersonA(e.target.value)}
                    placeholder="Ex: Marie"
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-2">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={dateA}
                    onChange={(e) => setDateA(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-transparent transition-all [color-scheme:dark]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Person B */}
            <div className="space-y-4">
              <h3 className="text-amber-300 font-semibold text-lg flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-300/20 rounded-full flex items-center justify-center text-sm">
                  2
                </span>
                Deuxième personne
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-sm mb-2">
                    Prénom
                  </label>
                  <input
                    type="text"
                    value={personB}
                    onChange={(e) => setPersonB(e.target.value)}
                    placeholder="Ex: Thomas"
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-2">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    value={dateB}
                    onChange={(e) => setDateB(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-transparent transition-all [color-scheme:dark]"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-4">
              <h3 className="text-amber-300 font-semibold text-lg flex items-center gap-2">
                <span className="w-8 h-8 bg-amber-300/20 rounded-full flex items-center justify-center text-sm">
                  ✉
                </span>
                Votre email (pour le rapport)
              </h3>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full px-4 py-3 bg-slate-800/80 border border-slate-600/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/50 focus:border-transparent transition-all"
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
              className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-amber-500/25"
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
            <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6 md:p-8 shadow-xl shadow-slate-950/50 text-center">
              <p className="text-slate-400 text-sm uppercase tracking-wider mb-2">
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
              <p className="text-slate-300 text-lg leading-relaxed">
                {result.shortSummary}
              </p>
            </div>

            {/* Quick Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/60 border border-green-500/30 rounded-xl p-5">
                <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                  <span>💚</span> Points forts
                </h4>
                <p className="text-slate-300 text-sm leading-relaxed line-clamp-3">
                  {result.strengths}
                </p>
              </div>
              <div className="bg-slate-900/60 border border-orange-500/30 rounded-xl p-5">
                <h4 className="text-orange-400 font-semibold mb-2 flex items-center gap-2">
                  <span>⚠️</span> Points de vigilance
                </h4>
                <p className="text-slate-300 text-sm leading-relaxed line-clamp-3">
                  {result.weaknesses}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-amber-500/30 rounded-2xl p-6 md:p-8">
              <div className="text-center mb-6">
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                  Envie d&apos;aller plus loin ?
                </h3>
                <p className="text-slate-400">
                  Obtenez votre rapport complet avec une analyse détaillée et des
                  conseils personnalisés.
                </p>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="text-amber-300">✓</span> Analyse complète de
                    votre compatibilité
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-amber-300">✓</span> Forces et défis de
                    votre relation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-amber-300">✓</span> Conseils
                    personnalisés pour l&apos;avenir
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-amber-300">✓</span> Format PDF
                    téléchargeable
                  </li>
                </ul>
              </div>

              <div className="text-center">
                <p className="text-amber-300 text-2xl font-bold mb-4">4,90 €</p>
                <button
                  onClick={handleBuy}
                  disabled={checkoutLoading || !email}
                  className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-amber-500/25"
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
        <footer className="mt-16 text-center text-slate-500 text-sm">
          <p>
            AstroMatch · Projet expérimental.
            <br />
            Ne remplace pas un avis professionnel, mais peut aider à réfléchir à
            vos relations.
          </p>
          <p className="mt-4">
            <a
              href="/landing"
              className="text-amber-300/70 hover:text-amber-300 transition-colors"
            >
              En savoir plus →
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
