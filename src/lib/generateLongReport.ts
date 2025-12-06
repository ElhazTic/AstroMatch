import { getOpenAIClient } from "@/lib/openai";
import { buildPremiumReportPrompt, PremiumReportData } from "@/lib/longReportPrompt";

export interface LongReportParams {
  personA: string;
  dateA: string;
  personB: string;
  dateB: string;
}

/**
 * Génère un rapport premium de compatibilité via OpenAI avec sortie JSON structurée.
 * 
 * Garantit :
 * - Aucune duplication entre portraitA et portraitB
 * - Toutes les sections remplies avec du contenu substantiel
 * - Score entre 50-95
 * - JSON valide et parsable
 */
export async function generateLongReport(params: LongReportParams): Promise<PremiumReportData> {
  const { personA, dateA, personB, dateB } = params;

  const { systemPrompt, userPrompt } = buildPremiumReportPrompt(personA, dateA, personB, dateB);

  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.85,
    max_tokens: 4500,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenAI for premium report");
  }

  // Nettoyage et parsing du JSON
  let cleanContent = content.trim();

  // Enlever les backticks markdown si présents (sécurité supplémentaire)
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

  let reportData: PremiumReportData;

  try {
    reportData = JSON.parse(cleanContent) as PremiumReportData;
  } catch {
    console.error("Failed to parse OpenAI response as JSON:", cleanContent.substring(0, 500));
    throw new Error("Invalid JSON response from OpenAI");
  }

  // Validation et normalisation des données
  reportData = validateAndNormalizeReport(reportData, personA, personB);

  // Log pour debug
  console.log(`Premium report generated - Score: ${reportData.score}`);
  console.log(`portraitA length: ${reportData.portraitA.length} chars`);
  console.log(`portraitB length: ${reportData.portraitB.length} chars`);

  return reportData;
}

/**
 * Valide et normalise les données du rapport pour garantir la qualité
 */
function validateAndNormalizeReport(
  data: Partial<PremiumReportData>,
  personA: string,
  personB: string
): PremiumReportData {
  // Score : toujours entre 50 et 95
  let score = typeof data.score === "number" ? data.score : 75;
  score = Math.max(50, Math.min(95, Math.round(score)));

  // Vérification de non-duplication des portraits
  const portraitA = data.portraitA || generateDefaultPortraitA(personA);
  let portraitB = data.portraitB || generateDefaultPortraitB(personB);

  // Détection de duplication par similarité
  if (portraitA === portraitB || calculateSimilarity(portraitA, portraitB) > 0.7) {
    console.warn("Portrait duplication detected, using unique fallback for portraitB");
    portraitB = generateDefaultPortraitB(personB);
  }

  return {
    score,
    summary: data.summary || generateDefaultSummary(personA, personB, score),
    portraitA,
    portraitB,
    coupleDynamic: data.coupleDynamic || generateDefaultDynamic(personA, personB),
    strengths: data.strengths || generateDefaultStrengths(personA, personB),
    weaknesses: data.weaknesses || generateDefaultWeaknesses(),
    advice: data.advice || generateDefaultAdvice(),
    conclusion: data.conclusion || generateDefaultConclusion(personA, personB),
  };
}

/**
 * Calcule un score de similarité simple entre deux textes (0 = différent, 1 = identique)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  let intersection = 0;
  words1.forEach(word => {
    if (words2.has(word)) intersection++;
  });
  
  const union = words1.size + words2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// ============================================
// Fonctions de génération de contenu par défaut (fallback)
// ============================================

function generateDefaultSummary(personA: string, personB: string, score: number): string {
  return `L'union entre ${personA} et ${personB} révèle une alchimie cosmique fascinante, tissée dans les étoiles avec une rare intensité. Avec un score de compatibilité de ${score}%, cette relation porte en elle les germes d'une connexion profonde et transformatrice. Les énergies de ces deux êtres se rencontrent sur un terrain fertile, où la compréhension mutuelle peut s'épanouir naturellement. Cette analyse dévoile les forces qui les unissent, les défis qui les invitent à grandir, et les chemins lumineux qui s'ouvrent devant eux. Chaque aspect de leur union raconte une histoire unique, un récit cosmique écrit dans les constellations de leurs destins entremêlés.`;
}

function generateDefaultPortraitA(name: string): string {
  return `${name} possède une âme riche et nuancée, capable d'une profondeur émotionnelle remarquable qui touche tous ceux qui croisent son chemin. Sa personnalité se caractérise par une sensibilité exquise qui lui permet de percevoir les subtilités invisibles des relations humaines. Dans l'amour, ${name} recherche une connexion authentique et profonde, un échange où les masques tombent et où l'intimité véritable peut enfin s'exprimer librement. Son style d'attachement révèle un équilibre délicat entre le besoin d'indépendance et le désir de fusion, entre l'espace personnel sacré et le partage total. Les forces de ${name} résident dans sa capacité innée à créer des liens durables et significatifs, à tisser des connections qui transcendent le temps. Sa vulnérabilité, loin d'être une faiblesse, devient une porte ouverte vers une intimité authentique. ${name} apporte dans chaque relation une flamme constante, une présence rassurante qui illumine les moments de doute.`;
}

function generateDefaultPortraitB(name: string): string {
  return `${name} incarne une énergie distincte et précieuse, un souffle nouveau qui transforme chaque relation en aventure. Son approche de l'amour est teintée d'une authenticité désarmante qui ne laisse personne indifférent. La manière dont ${name} communique ses émotions reflète une maturité affective qui enrichit profondément les échanges. Dans l'intimité, cette personne cherche à construire quelque chose de solide et de vrai, un édifice relationnel fait de confiance et de complicité. Ses besoins affectifs se manifestent par une quête de stabilité émotionnelle, tout en préservant l'espace nécessaire à l'épanouissement individuel de chacun. ${name} possède la capacité rare de rester ancré(e) et présent(e) dans les moments difficiles, offrant un refuge sûr quand les tempêtes émotionnelles surgissent. Son intelligence du cœur guide ses choix relationnels, créant un équilibre harmonieux entre donner et recevoir. La chaleur naturelle qui émane de ${name} crée un cocon protecteur où l'amour peut grandir en toute sérénité.`;
}

function generateDefaultDynamic(personA: string, personB: string): string {
  return `La rencontre entre ${personA} et ${personB} crée une dynamique relationnelle où les énergies se complètent et parfois se confrontent de manière constructive. Leur compatibilité émotionnelle se manifeste dans leur capacité à se comprendre au-delà des mots, à percevoir ce que l'autre ressent avant même qu'il ne l'exprime. Les moments de quotidien partagé révèlent des complémentarités naturelles et surprenantes : là où l'un apporte sa force tranquille, l'autre offre sa douceur réconfortante. Leur communication, bien que perfectible, porte les marques d'une volonté sincère de se comprendre et de s'ajuster mutuellement. Les zones de friction potentielles deviennent des opportunités de croissance lorsqu'elles sont abordées avec bienveillance et ouverture. Par exemple, leurs différences de rythme émotionnel peuvent créer des décalages momentanés, mais aussi une richesse complémentaire précieuse. Ensemble, ils créent un espace unique où chacun peut être pleinement soi-même.`;
}

function generateDefaultStrengths(personA: string, personB: string): string {
  return `Les forces majeures de l'union entre ${personA} et ${personB} résident dans leur capacité naturelle à créer un espace de confiance mutuelle et d'acceptation inconditionnelle. Leur complémentarité émotionnelle leur permet de se soutenir efficacement dans les épreuves de la vie. La communication entre eux possède une fluidité rare qui favorise la résolution des conflits avant qu'ils ne s'enveniment. Ensemble, ils forment un duo capable de projets communs ambitieux, nourris par une vision partagée de leur avenir. Leur alchimie crée une synergie où chacun élève l'autre vers le meilleur de lui-même.`;
}

function generateDefaultWeaknesses(): string {
  return `Comme toute relation authentique, certains aspects méritent une attention particulière et un travail conscient. Les différences de rythme émotionnel peuvent parfois créer des décalages temporaires qui demandent patience et compréhension. La communication, bien que présente, gagne à être approfondie dans les moments de tension pour éviter les malentendus. Le défi principal consiste à maintenir l'équilibre subtil entre besoins individuels et aspirations communes, sans que l'un ne s'efface au profit de l'autre. Ces zones de vigilance, abordées avec conscience, deviennent des tremplins vers une intimité plus profonde.`;
}

function generateDefaultAdvice(): string {
  return `Pour faire prospérer cette relation et lui permettre d'atteindre son plein potentiel, cultivez l'écoute active et la patience au quotidien. Accordez-vous des moments de qualité réguliers, loin des distractions et des obligations. Apprenez à exprimer vos besoins avec clarté et douceur, sans crainte du jugement. Célébrez vos différences comme des forces complémentaires plutôt que des obstacles. Construisez ensemble des rituels qui nourrissent votre intimité et renforcent votre complicité. N'hésitez pas à vous surprendre mutuellement pour maintenir la flamme vivante et l'émerveillement intacte. Face aux désaccords inévitables, choisissez la compréhension plutôt que la victoire, le dialogue plutôt que le silence.`;
}

function generateDefaultConclusion(personA: string, personB: string): string {
  return `L'analyse de la compatibilité entre ${personA} et ${personB} révèle un potentiel relationnel riche, prometteur et profondément transformateur. Cette union, comme toutes les belles histoires d'amour, demande à être cultivée avec attention, patience et dévouement quotidien. Les étoiles offrent une carte précieuse, mais c'est vous seuls qui tracez le chemin de votre destinée commune. Que cette analyse vous inspire à explorer les profondeurs de votre connexion et à bâtir ensemble un avenir lumineux. L'amour véritable n'est jamais une destination finale mais un voyage quotidien, fait de choix conscients, de présence mutuelle et de croissance partagée. Puisse votre union rayonner de cette lumière unique que seuls deux cœurs alignés peuvent créer.`;
}
