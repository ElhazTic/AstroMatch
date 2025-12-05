import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a0c1a] to-slate-950">
      {/* Animated stars background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <span className="inline-block px-4 py-2 bg-amber-300/10 border border-amber-300/30 rounded-full text-amber-300 text-sm font-medium mb-6">
              ✨ Nouveau · Analyse IA + Astrologie
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
            Comprenez votre connexion{" "}
            <span className="text-amber-300">avant de vous perdre dedans.</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
            AstroMatch analyse votre compatibilité amoureuse en 30 secondes grâce
            à l&apos;IA, l&apos;astrologie et la psychologie relationnelle.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/"
              className="px-8 py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-amber-500/25"
            >
              Faire le test gratuit →
            </Link>
            <a
              href="#apercu"
              className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-600 text-white font-medium rounded-xl transition-all duration-300"
            >
              Voir un exemple de rapport
            </a>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-8 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Test gratuit
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Résultat en 30 secondes
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span> Données confidentielles
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="relative z-10 py-20 px-4 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-slate-500 text-sm uppercase tracking-wider mb-10">
            Ce qu&apos;ils en disent
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-1 text-amber-400 mb-4">
                {"★★★★★".split("").map((star, i) => (
                  <span key={i}>{star}</span>
                ))}
              </div>
              <p className="text-slate-300 italic mb-4">
                &ldquo;Je pensais que ce serait gadget, mais le rapport m&apos;a parlé droit
                au cœur. Des choses que je n&apos;osais pas formuler, écrites noir sur
                blanc.&rdquo;
              </p>
              <p className="text-slate-500 text-sm">— Camille, 28 ans</p>
            </div>

            <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-1 text-amber-400 mb-4">
                {"★★★★★".split("").map((star, i) => (
                  <span key={i}>{star}</span>
                ))}
              </div>
              <p className="text-slate-300 italic mb-4">
                &ldquo;On l&apos;a fait avec mon copain pour rigoler. Finalement, ça a ouvert
                une vraie discussion sur nos différences. Surprenant !&rdquo;
              </p>
              <p className="text-slate-500 text-sm">— Léa &amp; Hugo</p>
            </div>

            <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center gap-1 text-amber-400 mb-4">
                {"★★★★☆".split("").map((star, i) => (
                  <span key={i}>{star}</span>
                ))}
              </div>
              <p className="text-slate-300 italic mb-4">
                &ldquo;Pas un oracle, mais un bon miroir. Les conseils sont pertinents et
                le ton est bienveillant. Ça vaut largement les 5€.&rdquo;
              </p>
              <p className="text-slate-500 text-sm">— Antoine, 34 ans</p>
            </div>
          </div>

          <p className="text-center text-slate-500 text-xs mt-8">
            Projet indépendant français · Données traitées de manière
            confidentielle
          </p>
        </div>
      </section>

      {/* How it Works */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-center text-slate-400 mb-16 max-w-2xl mx-auto">
            Trois étapes simples pour comprendre votre compatibilité
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-300/30 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">📝</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                1. Entrez vos infos
              </h3>
              <p className="text-slate-400">
                Prénoms et dates de naissance des deux personnes. C&apos;est tout ce
                qu&apos;il nous faut.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-400/20 to-purple-600/20 border border-purple-300/30 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">🔮</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                2. L&apos;IA analyse
              </h3>
              <p className="text-slate-400">
                Notre algorithme croise astrologie, psychologie et dynamiques
                relationnelles en 30 secondes.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 border border-emerald-300/30 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">📄</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                3. Recevez le rapport
              </h3>
              <p className="text-slate-400">
                Un PDF complet avec votre score, vos forces, vos défis et des
                conseils personnalisés.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What You'll Discover */}
      <section className="relative z-10 py-20 px-4 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
            Ce que vous allez découvrir
          </h2>
          <p className="text-center text-slate-400 mb-16 max-w-2xl mx-auto">
            Un rapport complet pour mieux comprendre votre relation
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-6 flex gap-4">
              <div className="text-3xl">💚</div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  Les forces de votre lien
                </h4>
                <p className="text-slate-400 text-sm">
                  Ce qui vous unit naturellement et fait de votre connexion quelque
                  chose de spécial.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-6 flex gap-4">
              <div className="text-3xl">⚡</div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  Les points de friction
                </h4>
                <p className="text-slate-400 text-sm">
                  Les zones où vos énergies peuvent s&apos;opposer, et comment les
                  transformer en atouts.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-6 flex gap-4">
              <div className="text-3xl">🧠</div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  Vos dynamiques relationnelles
                </h4>
                <p className="text-slate-400 text-sm">
                  Comment vous fonctionnez ensemble : communication, besoins
                  affectifs, styles d&apos;attachement.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-6 flex gap-4">
              <div className="text-3xl">💡</div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  Des conseils concrets
                </h4>
                <p className="text-slate-400 text-sm">
                  Des pistes actionnables pour mieux communiquer et renforcer votre
                  lien au quotidien.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why AI + Astro + Psycho */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
            Pourquoi IA + Astro + Psycho ?
          </h2>
          <p className="text-center text-slate-400 mb-12 max-w-2xl mx-auto">
            Une approche unique qui combine le meilleur de trois mondes
          </p>

          <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl p-8 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="text-4xl mb-3">🌙</div>
                <h4 className="text-amber-300 font-semibold mb-2">Astrologie</h4>
                <p className="text-slate-400 text-sm">
                  Un langage symbolique riche pour décrire les énergies et les
                  archétypes.
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🧠</div>
                <h4 className="text-amber-300 font-semibold mb-2">
                  Psychologie relationnelle
                </h4>
                <p className="text-slate-400 text-sm">
                  Un cadre scientifique pour comprendre les dynamiques de couple.
                </p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🤖</div>
                <h4 className="text-amber-300 font-semibold mb-2">
                  Intelligence artificielle
                </h4>
                <p className="text-slate-400 text-sm">
                  La capacité d&apos;assembler rapidement et de personnaliser l&apos;analyse.
                </p>
              </div>
            </div>

            <p className="text-slate-300 text-center leading-relaxed">
              Nous ne prétendons pas prédire l&apos;avenir. Notre objectif est de vous
              offrir un{" "}
              <span className="text-amber-300">miroir intelligent</span> pour
              réfléchir à votre relation avec un regard neuf.
            </p>
          </div>
        </div>
      </section>

      {/* Report Preview */}
      <section id="apercu" className="relative z-10 py-20 px-4 bg-slate-900/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-4">
            Aperçu du rapport
          </h2>
          <p className="text-center text-slate-400 mb-12 max-w-2xl mx-auto">
            Voici ce que vous recevrez par email après votre achat
          </p>

          <div className="bg-gradient-to-br from-[#050818] to-[#0a0c1a] border border-amber-300/30 rounded-2xl p-8 md:p-10 max-w-2xl mx-auto shadow-2xl shadow-amber-500/10">
            <div className="text-center mb-8">
              <h3 className="text-amber-300 text-2xl font-bold tracking-wide mb-2">
                ✨ ASTROMATCH
              </h3>
              <p className="text-slate-400 text-sm">
                Rapport de Compatibilité Amoureuse
              </p>
            </div>

            <div className="border-t border-amber-300/30 pt-6 mb-6">
              <p className="text-white text-xl font-semibold text-center mb-2">
                Marie &amp; Thomas
              </p>
              <p className="text-slate-400 text-sm text-center">
                Score de compatibilité :{" "}
                <span className="text-amber-300 text-3xl font-bold">78/100</span>
              </p>
            </div>

            <div className="space-y-4 text-sm">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-amber-300 font-semibold mb-2">
                  ✦ Résumé général
                </h4>
                <p className="text-slate-300">
                  Une connexion profonde marquée par une complémentarité
                  naturelle...
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-green-400 font-semibold mb-2">
                  ✦ Forces de la relation
                </h4>
                <p className="text-slate-300">
                  Communication fluide, valeurs alignées, attraction
                  magnétique...
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-orange-400 font-semibold mb-2">
                  ✦ Points de vigilance
                </h4>
                <p className="text-slate-300">
                  Différences de rythme, besoin d&apos;espace personnel...
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h4 className="text-purple-400 font-semibold mb-2">
                  ✦ Conseils pour l&apos;avenir
                </h4>
                <p className="text-slate-300">
                  Cultivez la patience, planifiez des moments de qualité...
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Pourquoi AstroMatch existe ?
          </h2>

          <div className="text-slate-300 leading-relaxed space-y-6 text-lg">
            <p>
              On s&apos;est tous déjà demandé :{" "}
              <span className="text-amber-300 italic">
                &ldquo;Est-ce qu&apos;on est faits l&apos;un pour l&apos;autre… ou est-ce qu&apos;on se
                raconte une histoire ?&rdquo;
              </span>
            </p>

            <p>
              Les débuts sont magiques, mais les doutes arrivent vite. On cherche
              des réponses sur Google, on lit des articles génériques, on demande
              à nos amis... sans jamais avoir de réponse vraiment personnalisée.
            </p>

            <p>
              AstroMatch est né de cette frustration. L&apos;idée :{" "}
              <span className="text-white font-medium">
                créer un outil qui donne un miroir honnête
              </span>
              , pas une sentence. Un point de départ pour réfléchir, discuter, et
              peut-être mieux se comprendre.
            </p>

            <p className="text-slate-400">
              Ce n&apos;est pas un oracle. C&apos;est un compagnon de réflexion.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 py-20 px-4 bg-slate-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Simple et transparent
          </h2>
          <p className="text-slate-400 mb-12">
            Le test est gratuit. Le rapport complet est à 4,90 €.
          </p>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-300/30 rounded-2xl p-8 md:p-10 max-w-md mx-auto shadow-xl shadow-amber-500/10">
            <div className="text-amber-300 text-5xl font-bold mb-2">4,90 €</div>
            <p className="text-slate-400 mb-8">Paiement unique, pas d&apos;abonnement</p>

            <ul className="text-left space-y-3 mb-8">
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span>
                Test de compatibilité gratuit
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span>
                Score + résumé instantané
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span>
                Rapport PDF complet
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span>
                Forces &amp; points de vigilance
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span>
                Conseils personnalisés
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <span className="text-green-400">✓</span>
                Envoi par email immédiat
              </li>
            </ul>

            <Link
              href="/"
              className="block w-full py-4 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold text-lg rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-amber-500/25"
            >
              Commencer gratuitement →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-white mb-12">
            Questions fréquentes
          </h2>

          <div className="space-y-6">
            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-3">
                Est-ce que c&apos;est fiable ?
              </h4>
              <p className="text-slate-400">
                AstroMatch combine plusieurs approches pour offrir une analyse
                nuancée. Ce n&apos;est pas une science exacte, mais un outil de
                réflexion qui peut mettre des mots sur des ressentis et ouvrir des
                conversations.
              </p>
            </div>

            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-3">
                Est-ce que mes données sont stockées ?
              </h4>
              <p className="text-slate-400">
                Non. Vos données sont utilisées uniquement pour générer votre
                rapport, puis supprimées. Nous ne conservons ni vos prénoms, ni vos
                dates de naissance, ni votre email après l&apos;envoi du rapport.
              </p>
            </div>

            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-3">
                Combien de temps pour recevoir le rapport ?
              </h4>
              <p className="text-slate-400">
                Immédiatement ! Dès que votre paiement est confirmé (généralement
                quelques secondes), le rapport est généré et envoyé à votre adresse
                email. Pensez à vérifier vos spams.
              </p>
            </div>

            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-3">
                Dois-je croire tout ce qui est écrit ?
              </h4>
              <p className="text-slate-400">
                Non, et c&apos;est important. Le rapport est un outil de réflexion, pas
                une vérité absolue. Prenez ce qui vous parle, laissez ce qui ne
                résonne pas. L&apos;essentiel est d&apos;ouvrir le dialogue avec vous-même ou
                votre partenaire.
              </p>
            </div>

            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-3">
                Est-ce réservé aux couples ?
              </h4>
              <p className="text-slate-400">
                Pas du tout ! Vous pouvez analyser la compatibilité avec un crush,
                un ex, un ami proche, ou même quelqu&apos;un que vous venez de
                rencontrer. C&apos;est aussi une façon ludique d&apos;explorer vos relations
                passées ou potentielles.
              </p>
            </div>

            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-3">
                Comment est calculé le score ?
              </h4>
              <p className="text-slate-400">
                Le score combine plusieurs facteurs : compatibilité astrologique
                (éléments, modalités), dynamiques psychologiques typiques, et
                analyse des complémentarités/frictions potentielles. L&apos;IA synthétise
                ces éléments en une note sur 100.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 py-20 px-4 bg-gradient-to-b from-slate-900/50 to-slate-950">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Prêt à découvrir votre compatibilité ?
          </h2>
          <p className="text-slate-400 mb-10 text-lg">
            Le test est gratuit et ne prend que 30 secondes.
          </p>

          <Link
            href="/"
            className="inline-block px-10 py-5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-bold text-xl rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-amber-500/25"
          >
            Faire le test maintenant ✨
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-10 px-4 border-t border-slate-800">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-amber-300 font-bold text-xl mb-4">✨ AstroMatch</p>
          <p className="text-slate-500 text-sm mb-6">
            Projet indépendant français · Ne remplace pas un avis médical ou
            psychologique.
          </p>
          <Link
            href="/"
            className="text-amber-300/70 hover:text-amber-300 transition-colors text-sm"
          >
            Faire le test →
          </Link>
        </div>
      </footer>
    </main>
  );
}
