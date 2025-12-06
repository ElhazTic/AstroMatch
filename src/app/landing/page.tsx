"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useEffect, useRef, Suspense } from "react";

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
    // Include UTM params in the API URL so the server can extract them
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

function LandingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [personA, setPersonA] = useState("");
  const [dateA, setDateA] = useState("");
  const [personB, setPersonB] = useState("");
  const [dateB, setDateB] = useState("");
  const visitLogged = useRef(false);

  // Extract UTM parameters from URL
  const getUTMString = () => {
    const utmParams = new URLSearchParams();
    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");
    const utmContent = searchParams.get("utm_content");
    const utmTerm = searchParams.get("utm_term");

    if (utmSource) utmParams.set("utm_source", utmSource);
    if (utmMedium) utmParams.set("utm_medium", utmMedium);
    if (utmCampaign) utmParams.set("utm_campaign", utmCampaign);
    if (utmContent) utmParams.set("utm_content", utmContent);
    if (utmTerm) utmParams.set("utm_term", utmTerm);

    return utmParams.toString();
  };

  // Log visit on page load with UTM tracking
  useEffect(() => {
    if (!visitLogged.current) {
      visitLogged.current = true;
      const utmString = getUTMString();
      logEvent("visit", "Landing page viewed", undefined, utmString || undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirige vers la page principale avec les params pour lancer l'analyse
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // Log as "intent" - this is NOT a real form submission, just interest shown
    // No KPI impact, no Telegram alert, just tracking user journey
    const utmString = getUTMString();
    logEvent("intent", "Landing mini-form filled", {
      personA: personA.trim(),
      dateA,
      personB: personB.trim(),
      dateB,
    }, utmString || undefined);
    
    // Preserve UTM params when redirecting to main page
    const params = new URLSearchParams({
      personA,
      dateA,
      personB,
      dateB,
    });
    
    // Add UTM params to preserve attribution
    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");
    const utmContent = searchParams.get("utm_content");
    const utmTerm = searchParams.get("utm_term");
    if (utmSource) params.set("utm_source", utmSource);
    if (utmMedium) params.set("utm_medium", utmMedium);
    if (utmCampaign) params.set("utm_campaign", utmCampaign);
    if (utmContent) params.set("utm_content", utmContent);
    if (utmTerm) params.set("utm_term", utmTerm);
    
    router.push("/?" + params.toString());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HERO */}
      <header className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/70 via-slate-950 to-slate-950" />
        <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16 md:flex-row md:items-center md:py-20">
          {/* Texte hero */}
          <div className="md:w-1/2 space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-purple-400/40 bg-purple-500/10 px-4 py-1 text-xs font-medium uppercase tracking-wide text-purple-100">
              🔮 AstroMatch · Rapport de compatibilité premium
            </span>

            <h1 className="text-3xl font-semibold leading-tight md:text-4xl lg:text-5xl">
              Votre compatibilité amoureuse{" "}
              <span className="bg-gradient-to-r from-purple-200 via-pink-200 to-amber-200 bg-clip-text text-transparent">
                révélée en 30&nbsp;secondes
              </span>
            </h1>

            <p className="max-w-xl text-sm text-slate-200/80 md:text-base">
              Recevez un rapport complet, profond et personnalisé sur votre
              couple. Une analyse qui combine astrologie moderne et psychologie
              relationnelle, livrée dans un PDF élégant prêt à être relu,
              partagé ou gardé pour vous.
            </p>

            <div className="space-y-2 text-sm text-slate-200/80">
              <p>
                <span className="font-semibold text-purple-100">
                  Rapport premium : 4,90&nbsp;€
                </span>{" "}
                · Génération et envoi immédiats après paiement sécurisé.
              </p>
              <p className="flex flex-wrap items-center gap-3 text-xs text-slate-300/70 md:text-sm">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-3 py-1">
                  ✦ Analyse écrite sur mesure
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-3 py-1">
                  ✦ Portraits individuels & dynamique du couple
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/70 px-3 py-1">
                  ✦ Conseils concrets pour la suite
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300/80 md:text-sm">
              <span>★ Note moyenne : 4,8 / 5</span>
              <span className="h-1 w-1 rounded-full bg-slate-400" />
              <span>Plusieurs centaines de rapports générés en test privé</span>
            </div>
          </div>

          {/* Bloc formulaire + "mock" PDF */}
          <div className="md:w-1/2">
            <div className="grid gap-4 md:grid-cols-1">
              {/* Carte formulaire */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/30 backdrop-blur">
                <h2 className="mb-1 text-lg font-semibold">
                  Testez votre compatibilité maintenant
                </h2>
                <p className="mb-4 text-xs text-slate-300/80 md:text-sm">
                  Entrez vos prénoms et dates de naissance. Votre rapport
                  complet sera généré après le paiement.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-200/90">
                        Prénom 1
                      </label>
                      <input
                        required
                        value={personA}
                        onChange={(e) => setPersonA(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40"
                        placeholder="Ex : Anaïs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-200/90">
                        Date de naissance 1
                      </label>
                      <input
                        required
                        type="date"
                        value={dateA}
                        onChange={(e) => setDateA(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40 [color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-200/90">
                        Prénom 2
                      </label>
                      <input
                        required
                        value={personB}
                        onChange={(e) => setPersonB(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40"
                        placeholder="Ex : Olivier"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-200/90">
                        Date de naissance 2
                      </label>
                      <input
                        required
                        type="date"
                        value={dateB}
                        onChange={(e) => setDateB(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40 [color-scheme:dark]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-purple-900/40 transition hover:brightness-110"
                  >
                    Obtenir mon analyse
                    <span className="text-xs font-normal text-slate-900/80">
                      4,90€ · PDF instantané
                    </span>
                  </button>

                  <p className="pt-1 text-[11px] leading-relaxed text-slate-400">
                    Paiement sécurisé via Stripe. Aucune donnée sensible autre
                    que vos prénoms et dates de naissance n&apos;est demandée.
                  </p>
                </form>
              </div>

              {/* Mock aperçu PDF */}
              <div className="hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200/90 shadow-lg shadow-slate-950/60 md:block">
                <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  Aperçu du rapport
                </p>
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-[11px] font-semibold text-purple-100">
                    &ldquo;Votre relation dégage une énergie vive et chaleureuse…&rdquo;
                  </p>
                  <p className="mt-2 text-[11px] text-slate-300">
                    Votre duo se construit sur une attraction sincère et une
                    forte curiosité mutuelle. L&apos;un apporte l&apos;impulsion, l&apos;autre
                    la vision, et cette complémentarité crée une dynamique rare
                    lorsqu&apos;elle est nourrie avec bienveillance et écoute…
                  </p>
                  <p className="mt-2 text-[10px] text-slate-500">
                    + Portraits individuels · Analyse croisée du couple ·
                    Conseils personnalisés · Conclusion inspirante.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* SECTION "POURQUOI ASTROMATCH" */}
      <section className="border-b border-slate-900 bg-slate-950">
        <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-xl font-semibold md:text-2xl">
              Pourquoi AstroMatch est différent des tests classiques&nbsp;?
            </h2>
            <p className="mt-2 text-sm text-slate-300/85 md:text-base">
              Ici, pas de score jeté en 2 lignes. Chaque rapport est un texte
              complet, rédigé, structuré, qui vous aide à mieux comprendre votre
              duo : vos forces, vos zones sensibles, et la façon de faire
              grandir la relation.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-50">
                ✨ Ultra-personnalisé
              </h3>
              <p className="text-xs text-slate-300/85">
                Chaque rapport est rédigé pour votre couple précis, avec vos
                prénoms, vos dates de naissance et votre dynamique. Aucun texte
                générique recyclé.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-50">
                🔮 Astrologie + psychologie
              </h3>
              <p className="text-xs text-slate-300/85">
                On ne se contente pas d&apos;un signe. On combine énergies
                astrologiques, styles d&apos;attachement et dynamiques relationnelles
                pour une analyse nuancée.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-50">
                📄 PDF premium instantané
              </h3>
              <p className="text-xs text-slate-300/85">
                Vous recevez un PDF structuré, élégant, que vous pouvez relire,
                annoter, partager ou garder comme boussole pour votre relation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ MINI */}
      <section className="border-b border-slate-900 bg-slate-950">
        <div className="mx-auto max-w-5xl px-6 py-12 md:py-16">
          <h2 className="mb-6 text-xl font-semibold md:text-2xl">
            Questions fréquentes
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Est-ce fiable&nbsp;?
              </h3>
              <p className="mt-1 text-xs text-slate-300/85">
                Le rapport s&apos;appuie sur une approche mêlant astrologie moderne
                et psychologie relationnelle. Ce n&apos;est pas une prédiction
                magique, mais un outil de réflexion pour mieux comprendre votre
                fonctionnement à deux.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Combien de temps avant de recevoir le PDF&nbsp;?
              </h3>
              <p className="mt-1 text-xs text-slate-300/85">
                Quelques secondes. Une fois le paiement validé, votre rapport
                est généré et envoyé automatiquement à l&apos;adresse e-mail que vous
                indiquez.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Est-ce un abonnement&nbsp;?
              </h3>
              <p className="mt-1 text-xs text-slate-300/85">
                Non. AstroMatch fonctionne sur un tarif unique : 4,90€ pour un
                rapport complet. Pas de récurrence, pas d&apos;engagement.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Quelles données sont utilisées&nbsp;?
              </h3>
              <p className="mt-1 text-xs text-slate-300/85">
                Uniquement vos prénoms et vos dates de naissance, nécessaires
                pour personnaliser l&apos;analyse. Aucune autre donnée sensible ne
                vous est demandée.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-6 text-xs text-slate-300/80">
            <p>
              Prêt à voir votre relation sous un autre angle&nbsp;?{" "}
              <span className="font-semibold text-purple-200">
                Lancez votre rapport maintenant.
              </span>
            </p>
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="rounded-full border border-purple-400/60 bg-purple-500/15 px-4 py-2 text-xs font-medium text-purple-100 hover:bg-purple-500/25"
            >
              Remonter au formulaire
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-900 bg-slate-950/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-[11px] text-slate-500">
          <p>AstroMatch · Rapport astrologique & analyse relationnelle</p>
          <div className="flex gap-4">
            <span>© {new Date().getFullYear()}</span>
            <span>Contact : zoe.ronsedmor@gmail.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Loading fallback for Suspense
function LandingPageLoading() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400">Chargement...</div>
    </div>
  );
}

// Export with Suspense wrapper for useSearchParams
export default function LandingPage() {
  return (
    <Suspense fallback={<LandingPageLoading />}>
      <LandingPageContent />
    </Suspense>
  );
}
