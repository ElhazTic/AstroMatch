import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de remboursement – AstroMatch",
  description: "Politique de remboursement pour les rapports AstroMatch",
};

export default function RemboursementPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-purple-200 via-pink-200 to-amber-200 bg-clip-text text-transparent">
          Politique de remboursement – AstroMatch
        </h1>

        <div className="space-y-8">
          {/* Contenu numérique */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <p className="text-slate-300 leading-relaxed">
              Le rapport AstroMatch est un contenu numérique personnalisé,
              généré automatiquement et livré immédiatement après paiement.
            </p>
          </section>

          {/* Droit de rétractation */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              Droit de rétractation
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Conformément à l&apos;article L221-28 du Code de la consommation,
              le droit de rétractation ne s&apos;applique pas.
            </p>
          </section>

          {/* Remboursement */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              Remboursement
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Aucun remboursement n&apos;est possible après génération du
              rapport, sauf impossibilité technique empêchant l&apos;envoi.
            </p>
          </section>

          {/* Contact */}
          <section className="rounded-2xl border border-amber-500/30 bg-amber-900/20 p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-amber-200 mb-4">
              Un problème technique ?
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Si vous n&apos;avez pas reçu votre rapport suite à un problème
              technique, contactez-nous à{" "}
              <a
                href="mailto:zoe.ronsedmor@gmail.com"
                className="text-purple-300 hover:text-purple-200 underline underline-offset-2"
              >
                zoe.ronsedmor@gmail.com
              </a>{" "}
              et nous trouverons une solution.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

