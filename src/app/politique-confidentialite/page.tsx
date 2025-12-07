import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité – AstroMatch",
  description: "Politique de confidentialité et protection des données personnelles d'AstroMatch",
};

export default function PolitiqueConfidentialitePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-purple-200 via-pink-200 to-amber-200 bg-clip-text text-transparent">
          Politique de confidentialité – AstroMatch
        </h1>

        <div className="space-y-8">
          {/* 1. Données collectées */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              1. Données collectées
            </h2>
            <ul className="text-slate-300 space-y-2 list-disc list-inside">
              <li>Prénoms et dates de naissance</li>
              <li>Email</li>
              <li>
                Données de paiement (via Stripe, jamais stockées localement)
              </li>
              <li>UTM, pages vues, événements du tunnel</li>
            </ul>
          </section>

          {/* 2. Finalités */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              2. Finalités
            </h2>
            <ul className="text-slate-300 space-y-2 list-disc list-inside">
              <li>Génération et envoi du rapport</li>
              <li>Suivi statistique (dashboard)</li>
              <li>Sécurisation des paiements</li>
            </ul>
          </section>

          {/* 3. Durée de conservation */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              3. Durée de conservation
            </h2>
            <ul className="text-slate-300 space-y-2 list-disc list-inside">
              <li>Données liées au rapport : 30 jours</li>
              <li>Logs anonymisés : durée illimitée (statistiques)</li>
            </ul>
          </section>

          {/* 4. Partage des données */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              4. Partage des données
            </h2>
            <p className="text-slate-300 leading-relaxed mb-3">
              Les données strictement nécessaires sont partagées avec :
            </p>
            <ul className="text-slate-300 space-y-2 list-disc list-inside">
              <li>
                <strong className="text-slate-100">Stripe</strong> (paiements)
              </li>
              <li>
                <strong className="text-slate-100">Vercel</strong> (hébergement)
              </li>
              <li>
                <strong className="text-slate-100">Resend</strong> (envoi email)
              </li>
            </ul>
          </section>

          {/* 5. Vos droits */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              5. Vos droits
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Droit d&apos;accès, rectification ou suppression via l&apos;adresse :{" "}
              <a
                href="mailto:zoe.ronsedmor@gmail.com"
                className="text-purple-300 hover:text-purple-200 underline underline-offset-2"
              >
                zoe.ronsedmor@gmail.com
              </a>
            </p>
          </section>

          {/* 6. Cookies */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              6. Cookies
            </h2>
            <p className="text-slate-300 leading-relaxed">
              AstroMatch utilise uniquement des cookies techniques internes,
              sans publicité.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

