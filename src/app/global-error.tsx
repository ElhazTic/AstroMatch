"use client";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="fr">
      <body style={{ 
        margin: 0, 
        backgroundColor: "#0f172a", 
        color: "#f8fafc",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <main style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div style={{
            maxWidth: "400px",
            width: "100%",
            textAlign: "center",
            backgroundColor: "rgba(30, 41, 59, 0.7)",
            border: "1px solid #334155",
            borderRadius: "1rem",
            padding: "2rem",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          }}>
            <div style={{ marginBottom: "1.5rem", fontSize: "3rem" }}>
              💥
            </div>
            
            <h1 style={{ 
              fontSize: "1.5rem", 
              fontWeight: 600, 
              color: "white",
              marginBottom: "0.75rem"
            }}>
              Erreur critique
            </h1>
            
            <p style={{ 
              color: "#94a3b8", 
              fontSize: "0.875rem",
              marginBottom: "1.5rem"
            }}>
              Une erreur inattendue s&apos;est produite. Veuillez réessayer.
            </p>

            <button
              onClick={reset}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "0.75rem",
                border: "none",
                background: "linear-gradient(to right, #a855f7, #d946ef, #fbbf24)",
                color: "#0f172a",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 10px 15px -3px rgba(147, 51, 234, 0.3)"
              }}
            >
              Réessayer 🔄
            </button>

            <a
              href="/"
              style={{
                display: "inline-block",
                marginTop: "1rem",
                color: "#c4b5fd",
                fontSize: "0.875rem",
                textDecoration: "none"
              }}
            >
              ← Retour à l&apos;accueil
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}

