import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente – AstroMatch",
  description: "Conditions générales de vente du service AstroMatch",
};

export default function CGVPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-purple-200 via-pink-200 to-amber-200 bg-clip-text text-transparent">
          Conditions Générales de Vente – AstroMatch
        </h1>

        <div className="space-y-8">
          {/* 1. Objet */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              1. Objet
            </h2>
            <p className="text-slate-300 leading-relaxed">
              AstroMatch propose un service numérique consistant en la
              génération d&apos;un rapport personnalisé au format PDF.
            </p>
          </section>

          {/* 2. Prix */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              2. Prix
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Le prix est affiché TTC, payable en une fois via Stripe.
            </p>
          </section>

          {/* 3. Livraison */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              3. Livraison
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Le rapport est généré automatiquement après paiement et envoyé
              immédiatement par email.
            </p>
          </section>

          {/* 4. Rétractation */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              4. Rétractation
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Conformément à l&apos;article L221-28 du Code de la consommation,
              le droit de rétractation ne s&apos;applique pas aux contenus
              numériques fournis immédiatement.
            </p>
            <p className="text-slate-300 mt-2">
              En validant l&apos;achat, l&apos;utilisateur renonce expressément
              à son droit de rétractation.
            </p>
          </section>

          {/* 5. Remboursements */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              5. Remboursements
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Aucun remboursement n&apos;est possible sauf impossibilité
              technique empêchant la livraison du rapport.
            </p>
          </section>

          {/* 6. Responsabilité */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              6. Responsabilité
            </h2>
            <p className="text-slate-300 leading-relaxed">
              AstroMatch ne garantit pas l&apos;exactitude des analyses qui sont
              fournies uniquement à titre ludique.
            </p>
          </section>

          {/* 7. Données personnelles */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              7. Données personnelles
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Les informations saisies (prénoms, dates de naissance, email) sont
              utilisées pour générer et envoyer le rapport.
            </p>
            <p className="text-slate-300 mt-2">
              Les données techniques (UTM, activités) servent uniquement aux
              statistiques internes.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

