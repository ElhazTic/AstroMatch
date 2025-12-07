import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales – AstroMatch",
  description: "Mentions légales du site AstroMatch",
};

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-purple-200 via-pink-200 to-amber-200 bg-clip-text text-transparent">
          Mentions légales – AstroMatch
        </h1>

        <div className="space-y-8">
          {/* Éditeur du site */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              Éditeur du site
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Le présent site est édité à titre personnel par :
            </p>
            <p className="text-slate-300 mt-2">
              <strong className="text-slate-100">Olivier F.</strong>
            </p>
            <p className="text-slate-300 mt-2">
              Email de contact :{" "}
              <a
                href="mailto:zoe.ronsedmor@gmail.com"
                className="text-purple-300 hover:text-purple-200 underline underline-offset-2"
              >
                zoe.ronsedmor@gmail.com
              </a>
            </p>
          </section>

          {/* Hébergement */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              Hébergement
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Le site est hébergé par :
            </p>
            <p className="text-slate-300 mt-2">
              <strong className="text-slate-100">Vercel Inc.</strong> – 440 N
              Barranca Ave #4133, Covina, CA 91723, USA
            </p>
            <p className="text-slate-300 mt-2">
              <a
                href="https://vercel.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-300 hover:text-purple-200 underline underline-offset-2"
              >
                https://vercel.com
              </a>
            </p>
          </section>

          {/* Propriété intellectuelle */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              Propriété intellectuelle
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Tous les contenus du site (textes, interface, PDF, design) sont
              protégés et ne peuvent être reproduits sans autorisation.
            </p>
          </section>

          {/* Responsabilité */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-purple-900/20">
            <h2 className="text-xl font-semibold text-purple-100 mb-4">
              Responsabilité
            </h2>
            <p className="text-slate-300 leading-relaxed">
              AstroMatch fournit des analyses relationnelles à titre ludique et
              informatif.
            </p>
            <p className="text-slate-300 mt-2">
              Ces contenus ne constituent en aucun cas des conseils
              psychologiques, médicaux ou professionnels.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

