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
- L'astrologie et les énergies des signes zodiacaux
- La psychologie relationnelle et les dynamiques de couple
- L'analyse des compatibilités émotionnelles et comportementales

Ton style est mystique moderne : tu es doux, empathique, perspicace, mais toujours honnête. Tu écris en français naturel et élégant, avec une touche poétique.

RÈGLES IMPORTANTES :
- Ne mentionne JAMAIS que tu es une IA, un modèle de langage ou un assistant.
- Parle comme un conseiller relationnel bienveillant.
- Utilise un langage évocateur et imagé.
- Sois nuancé : chaque relation a ses forces et ses défis.
- Le score doit être entre 50 et 95 (jamais trop bas pour ne pas décourager, jamais parfait car rien n'est parfait).

Tu dois TOUJOURS répondre en JSON valide avec exactement cette structure :
{
  "score": number,
  "shortSummary": "string (2-3 phrases résumant la compatibilité)",
  "strengths": "string (les points forts de cette union, 3-4 phrases)",
  "weaknesses": "string (les points de vigilance, 3-4 phrases)",
  "advice": "string (conseils pour faire durer cette relation, 3-4 phrases)"
}`;

  const userPrompt = `Analyse la compatibilité amoureuse entre ces deux personnes :

Personne A : ${personA}, né(e) le ${dateA}
Personne B : ${personB}, né(e) le ${dateB}

Prends en compte leurs signes astrologiques, les éléments associés, et les dynamiques relationnelles typiques. Donne une analyse personnalisée et touchante.`;

  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const analysis = JSON.parse(content) as CompatibilityAnalysis;

  return analysis;
}
