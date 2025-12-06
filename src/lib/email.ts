import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is not defined. Please add it to your .env.local file."
      );
    }

    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export interface EmailParams {
  to: string;
  personA: string;
  personB: string;
  pdfBytes: Uint8Array;
}

export async function sendReportEmail(params: EmailParams): Promise<void> {
  const { to, personA, personB, pdfBytes } = params;

  const emailFrom = process.env.EMAIL_FROM || "AstroMatch <onboarding@resend.dev>";

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre rapport AstroMatch</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0c1a;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0c1a;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background: linear-gradient(180deg, #0f1629 0%, #0a0c1a 100%); border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid #1e293b;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #fcd34d; letter-spacing: 2px;">
                ✨ ASTROMATCH ✨
              </h1>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #94a3b8;">
                Analyse de compatibilité amoureuse
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #ffffff; text-align: center;">
                Votre rapport est prêt ! 💫
              </h2>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #cbd5e1; line-height: 1.6;">
                Bonjour,
              </p>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #cbd5e1; line-height: 1.6;">
                Merci pour votre confiance ! Nous avons analysé la compatibilité entre 
                <strong style="color: #fcd34d;">${personA}</strong> et 
                <strong style="color: #fcd34d;">${personB}</strong>.
              </p>

              <p style="margin: 0 0 30px 0; font-size: 16px; color: #cbd5e1; line-height: 1.6;">
                Votre rapport complet est disponible en pièce jointe de cet email. 
                Prenez le temps de le lire, de le méditer, et peut-être de le partager avec votre partenaire.
              </p>

              <!-- Highlight Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 25px; border: 1px solid #334155;">
                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #fcd34d; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                      📎 Pièce jointe
                    </p>
                    <p style="margin: 0; font-size: 16px; color: #ffffff;">
                      AstroMatch-${personA}-${personB}.pdf
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; font-size: 16px; color: #cbd5e1; line-height: 1.6;">
                Nous vous souhaitons le meilleur dans votre parcours relationnel. 
                Que les étoiles illuminent votre chemin. ✨
              </p>

              <p style="margin: 20px 0 0 0; font-size: 16px; color: #cbd5e1;">
                L'équipe AstroMatch
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #050818; border-top: 1px solid #1e293b;">
              <p style="margin: 0 0 10px 0; font-size: 12px; color: #64748b; text-align: center; line-height: 1.5;">
                Ce rapport est un outil de réflexion et d'exploration personnelle.<br>
                Il ne remplace pas un avis professionnel en psychologie ou en conseil conjugal.
              </p>
              <p style="margin: 0; font-size: 12px; color: #475569; text-align: center;">
                © ${new Date().getFullYear()} AstroMatch · Projet indépendant français
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `
ASTROMATCH - Votre rapport est prêt !

Bonjour,

Merci pour votre confiance ! Nous avons analysé la compatibilité entre ${personA} et ${personB}.

Votre rapport complet est disponible en pièce jointe de cet email (AstroMatch-${personA}-${personB}.pdf).

Prenez le temps de le lire, de le méditer, et peut-être de le partager avec votre partenaire.

Nous vous souhaitons le meilleur dans votre parcours relationnel.

L'équipe AstroMatch

---
Ce rapport est un outil de réflexion et d'exploration personnelle.
Il ne remplace pas un avis professionnel en psychologie ou en conseil conjugal.
© ${new Date().getFullYear()} AstroMatch · Projet indépendant français
  `;

  try {
    const resend = getResendClient();

    const { error } = await resend.emails.send({
      from: emailFrom,
      to: [to],
      subject: "Votre rapport AstroMatch est prêt 💫",
      html: htmlContent,
      text: textContent,
      attachments: [
        {
          filename: `AstroMatch-${personA}-${personB}.pdf`,
          content: Buffer.from(pdfBytes).toString("base64"),
        },
      ],
    });

    if (error) {
      console.error("Error sending email:", error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log(`Email sent successfully to ${to}`);
  } catch (err) {
    console.error("Error in sendReportEmail:", err);
    throw err;
  }
}
