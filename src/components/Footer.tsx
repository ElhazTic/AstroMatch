import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/95">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          <Link
            href="/mentions-legales"
            className="text-xs text-gray-400 hover:text-white transition underline-offset-2 hover:underline"
          >
            Mentions légales
          </Link>
          <Link
            href="/conditions-generales-vente"
            className="text-xs text-gray-400 hover:text-white transition underline-offset-2 hover:underline"
          >
            CGV
          </Link>
          <Link
            href="/politique-confidentialite"
            className="text-xs text-gray-400 hover:text-white transition underline-offset-2 hover:underline"
          >
            Politique de confidentialité
          </Link>
          <Link
            href="/remboursement"
            className="text-xs text-gray-400 hover:text-white transition underline-offset-2 hover:underline"
          >
            Remboursement
          </Link>
        </div>
        <p className="text-center text-slate-500 text-xs mt-4">
          © {new Date().getFullYear()} AstroMatch · Projet indépendant français
        </p>
      </div>
    </footer>
  );
}

