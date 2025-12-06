import { getOpenAIClient } from "@/lib/openai";
import { longReportPrompt } from "@/lib/longReportPrompt";

export interface LongReportParams {
  personA: string;
  dateA: string;
  personB: string;
  dateB: string;
}

export async function generateLongReport(params: LongReportParams): Promise<string> {
  const { personA, dateA, personB, dateB } = params;

  // Remplacer les variables dans le prompt
  const systemPrompt = longReportPrompt
    .replace(/\$\{personA\}/g, personA)
    .replace(/\$\{personB\}/g, personB);

  const userPrompt = `Génère maintenant le rapport premium de compatibilité amoureuse entre :

Personne A : ${personA}, né(e) le ${dateA}
Personne B : ${personB}, né(e) le ${dateB}

Respecte scrupuleusement la structure en 8 sections.
Écris un texte entre 600 et 900 mots, fluide, personnel et profond.
N'utilise pas de formatage markdown (pas de # ou **), écris en texte pur avec des sauts de ligne pour les sections.
Chaque section doit commencer par son titre en majuscules suivi de deux points.`;

  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.85,
    max_tokens: 3000,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenAI for long report");
  }

  return content.trim();
}

