import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not defined. Please add it to your .env.local file."
      );
    }

    openaiClient = new OpenAI({
      apiKey,
    });
  }

  return openaiClient;
}

export { getOpenAIClient };

export interface CompatibilityAnalysis {
  score: number;
  shortSummary: string;
  strengths: string;
  weaknesses: string;
  advice: string;
}

export async function analyzeCompatibility(params: {
  personA: string;
  dateA: string;
  personB: string;
  dateB: string;
}): Promise<CompatibilityAnalysis> {
  const { personA, dateA, personB, dateB } = params;

  const systemPrompt = `Tu es ASTROMATCH, un expert en compatibilité amoureuse qui combine avec finesse :
- L'astrologie moderne et les énergies zodiacales,
- La psychologie relationnelle et les dynamiques affectives,
- L'analyse des compatibilités émotionnelles et comportementales.

Ton style est mystique moderne : doux, empathique, élégant, imagé, mais toujours nuancé et honnête.
Tu écris avec profondeur mais de manière fluide.

RÈGLES IMPORTANTES :
- Ne mentionne jamais l'IA ou un modèle de langage.
- Parle comme un conseiller amoureux expérimenté et bienveillant.
- Utilise un langage évocateur, poétique, mais clair.
- Sois nuancé : chaque relation a des forces et des défis.
- Le score doit être entre 50 et 95 (jamais trop bas, jamais parfait).`;

  const userPrompt = `Tu dois TOUJOURS répondre en JSON valide avec exactement cette structure :

{
  "score": number,
  "shortSummary": "string (2–3 phrases résumant élégamment la compatibilité)",
  "strengths": "string (4–5 phrases profondes et personnalisées sur les forces du duo)",
  "weaknesses": "string (4–5 phrases nuancées sur les zones sensibles et défis potentiels)",
  "advice": "string (5–6 phrases de conseils concrets, psychologiques et relationnels)"
}

Analyse la compatibilité amoureuse entre ces deux personnes :

Personne A : ${personA}, né(e) le ${dateA}
Personne B : ${personB}, né(e) le ${dateB}

Prends en compte :
- leurs signes astrologiques,
- leurs éléments,
- leurs styles émotionnels et relationnels,
- leurs dynamiques possibles.

Génère une analyse touchante, riche, poétique et personnalisée.`;

  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenAI");
  }

  // Validation JSON et nettoyage
  let cleanContent = content.trim();
  
  // Enlever les backticks markdown si présents
  if (cleanContent.startsWith("```json")) {
    cleanContent = cleanContent.slice(7);
  }
  if (cleanContent.startsWith("```")) {
    cleanContent = cleanContent.slice(3);
  }
  if (cleanContent.endsWith("```")) {
    cleanContent = cleanContent.slice(0, -3);
  }
  cleanContent = cleanContent.trim();

  const analysis = JSON.parse(cleanContent) as CompatibilityAnalysis;

  // Validation du score
  if (typeof analysis.score !== "number" || analysis.score < 50 || analysis.score > 95) {
    analysis.score = Math.min(95, Math.max(50, analysis.score || 75));
  }

  return analysis;
}
