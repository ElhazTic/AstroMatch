import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from "pdf-lib";

// Couleurs du thème Premium
const BACKGROUND = rgb(0.047, 0.059, 0.106); // #0C0F1B
const GOLD = rgb(0.851, 0.643, 0.255); // #D9A441
const TEXT_COLOR = rgb(0.965, 0.953, 0.933); // #F6F3EE
const LIGHT_GOLD = rgb(0.918, 0.812, 0.525); // #EACF86
const DARK_ACCENT = rgb(0.078, 0.094, 0.157); // #141828

// Dimensions
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const HEADER_HEIGHT = 30;
const FOOTER_HEIGHT = 30;

interface PdfContext {
  pdfDoc: PDFDocument;
  helvetica: PDFFont;
  helveticaBold: PDFFont;
  timesRoman: PDFFont;
  timesRomanBold: PDFFont;
  currentPage: PDFPage;
  yPosition: number;
  pageNumber: number;
  personA: string;
  personB: string;
}

// Fonction pour wrapper le texte intelligemment
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

// Fonction pour dessiner le fond de page
function drawBackground(page: PDFPage): void {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: BACKGROUND,
  });
}

// Fonction pour dessiner le header
function drawHeader(ctx: PdfContext): void {
  const { currentPage, helvetica } = ctx;

  // Ligne dorée en haut
  currentPage.drawRectangle({
    x: MARGIN,
    y: PAGE_HEIGHT - 35,
    width: CONTENT_WIDTH,
    height: 1,
    color: GOLD,
  });

  // Texte header
  currentPage.drawText("AstroMatch — Rapport de Compatibilité", {
    x: MARGIN,
    y: PAGE_HEIGHT - 28,
    size: 9,
    font: helvetica,
    color: LIGHT_GOLD,
  });
}

// Fonction pour dessiner le footer avec numéro de page
function drawFooter(ctx: PdfContext): void {
  const { currentPage, helvetica, pageNumber } = ctx;

  // Ligne dorée en bas
  currentPage.drawRectangle({
    x: MARGIN,
    y: FOOTER_HEIGHT + 10,
    width: CONTENT_WIDTH,
    height: 1,
    color: GOLD,
  });

  // Numéro de page centré
  const pageText = `— ${pageNumber} —`;
  const textWidth = helvetica.widthOfTextAtSize(pageText, 10);
  currentPage.drawText(pageText, {
    x: (PAGE_WIDTH - textWidth) / 2,
    y: FOOTER_HEIGHT - 5,
    size: 10,
    font: helvetica,
    color: LIGHT_GOLD,
  });
}

// Fonction pour créer une nouvelle page
function createNewPage(ctx: PdfContext, withHeaderFooter = true): void {
  ctx.currentPage = ctx.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.pageNumber++;
  drawBackground(ctx.currentPage);

  if (withHeaderFooter) {
    drawHeader(ctx);
    drawFooter(ctx);
    ctx.yPosition = PAGE_HEIGHT - MARGIN - HEADER_HEIGHT;
  } else {
    ctx.yPosition = PAGE_HEIGHT - MARGIN;
  }
}

// Fonction pour vérifier si on doit créer une nouvelle page
function checkNewPage(ctx: PdfContext, requiredSpace: number): void {
  if (ctx.yPosition - requiredSpace < MARGIN + FOOTER_HEIGHT + 20) {
    createNewPage(ctx);
  }
}

// Fonction pour dessiner un titre de section
function drawSectionTitle(ctx: PdfContext, title: string): void {
  checkNewPage(ctx, 60);

  const { currentPage, helveticaBold } = ctx;

  // Ligne décorative au-dessus
  currentPage.drawRectangle({
    x: MARGIN,
    y: ctx.yPosition + 5,
    width: 60,
    height: 2,
    color: GOLD,
  });

  ctx.yPosition -= 20;

  currentPage.drawText(title.toUpperCase(), {
    x: MARGIN,
    y: ctx.yPosition,
    size: 14,
    font: helveticaBold,
    color: GOLD,
  });

  ctx.yPosition -= 25;
}

// Fonction pour dessiner un paragraphe
function drawParagraph(
  ctx: PdfContext,
  text: string,
  fontSize = 11,
  lineHeight = 18
): void {
  const { currentPage, timesRoman } = ctx;
  const lines = wrapText(text, timesRoman, fontSize, CONTENT_WIDTH);

  for (const line of lines) {
    checkNewPage(ctx, lineHeight + 5);
    currentPage.drawText(line, {
      x: MARGIN,
      y: ctx.yPosition,
      size: fontSize,
      font: timesRoman,
      color: TEXT_COLOR,
    });
    ctx.yPosition -= lineHeight;
  }

  ctx.yPosition -= 10;
}

// ============================================
// PAGE DE COUVERTURE
// ============================================
function createCoverPage(
  ctx: PdfContext,
  personA: string,
  personB: string,
  score: number
): void {
  const page = ctx.pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  ctx.currentPage = page;
  ctx.pageNumber = 0; // La couverture ne compte pas

  drawBackground(page);

  // Décoration haut de page
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 100,
    width: PAGE_WIDTH,
    height: 100,
    color: DARK_ACCENT,
  });

  // Ligne dorée décorative
  page.drawRectangle({
    x: MARGIN,
    y: PAGE_HEIGHT - 102,
    width: CONTENT_WIDTH,
    height: 2,
    color: GOLD,
  });

  // Titre ASTROMATCH
  const titleText = "ASTROMATCH";
  const titleWidth = ctx.helveticaBold.widthOfTextAtSize(titleText, 42);
  page.drawText(titleText, {
    x: (PAGE_WIDTH - titleWidth) / 2,
    y: PAGE_HEIGHT - 180,
    size: 42,
    font: ctx.helveticaBold,
    color: GOLD,
  });

  // Sous-titre
  const subtitleText = "Analyse Premium de Compatibilité";
  const subtitleWidth = ctx.helvetica.widthOfTextAtSize(subtitleText, 16);
  page.drawText(subtitleText, {
    x: (PAGE_WIDTH - subtitleWidth) / 2,
    y: PAGE_HEIGHT - 210,
    size: 16,
    font: ctx.helvetica,
    color: LIGHT_GOLD,
  });

  // Ligne décorative centrale
  page.drawRectangle({
    x: PAGE_WIDTH / 2 - 100,
    y: PAGE_HEIGHT - 280,
    width: 200,
    height: 1,
    color: GOLD,
  });

  // Noms des personnes
  const namesText = `${personA} & ${personB}`;
  const namesWidth = ctx.helveticaBold.widthOfTextAtSize(namesText, 28);
  page.drawText(namesText, {
    x: (PAGE_WIDTH - namesWidth) / 2,
    y: PAGE_HEIGHT - 350,
    size: 28,
    font: ctx.helveticaBold,
    color: TEXT_COLOR,
  });

  // Score encadré élégant
  const scoreY = PAGE_HEIGHT - 480;

  // Fond du score
  page.drawRectangle({
    x: PAGE_WIDTH / 2 - 80,
    y: scoreY - 30,
    width: 160,
    height: 100,
    color: DARK_ACCENT,
    borderColor: GOLD,
    borderWidth: 2,
  });

  // Label score
  const scoreLabelText = "SCORE DE COMPATIBILITÉ";
  const scoreLabelWidth = ctx.helvetica.widthOfTextAtSize(scoreLabelText, 10);
  page.drawText(scoreLabelText, {
    x: (PAGE_WIDTH - scoreLabelWidth) / 2,
    y: scoreY + 50,
    size: 10,
    font: ctx.helvetica,
    color: LIGHT_GOLD,
  });

  // Score
  const scoreText = `${score}/100`;
  const scoreWidth = ctx.helveticaBold.widthOfTextAtSize(scoreText, 36);
  page.drawText(scoreText, {
    x: (PAGE_WIDTH - scoreWidth) / 2,
    y: scoreY,
    size: 36,
    font: ctx.helveticaBold,
    color: GOLD,
  });

  // Décoration bas de page
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: 80,
    color: DARK_ACCENT,
  });

  page.drawRectangle({
    x: MARGIN,
    y: 80,
    width: CONTENT_WIDTH,
    height: 2,
    color: GOLD,
  });

  // Copyright
  const copyrightText = `© ${new Date().getFullYear()} AstroMatch — Tous droits réservés`;
  const copyrightWidth = ctx.helvetica.widthOfTextAtSize(copyrightText, 9);
  page.drawText(copyrightText, {
    x: (PAGE_WIDTH - copyrightWidth) / 2,
    y: 40,
    size: 9,
    font: ctx.helvetica,
    color: LIGHT_GOLD,
  });
}

// ============================================
// TABLE DES MATIÈRES
// ============================================
function createTableOfContents(ctx: PdfContext): void {
  createNewPage(ctx, false);
  const page = ctx.currentPage;

  drawBackground(page);

  let y = PAGE_HEIGHT - 80;

  // Titre
  const tocTitle = "TABLE DES MATIÈRES";
  const tocTitleWidth = ctx.helveticaBold.widthOfTextAtSize(tocTitle, 24);
  page.drawText(tocTitle, {
    x: (PAGE_WIDTH - tocTitleWidth) / 2,
    y,
    size: 24,
    font: ctx.helveticaBold,
    color: GOLD,
  });

  y -= 20;

  // Ligne décorative
  page.drawRectangle({
    x: PAGE_WIDTH / 2 - 80,
    y,
    width: 160,
    height: 2,
    color: GOLD,
  });

  y -= 60;

  const sections = [
    { num: "1", title: "Introduction", page: "3" },
    { num: "2", title: `Portrait Individuel — ${ctx.personA}`, page: "3" },
    { num: "3", title: `Portrait Individuel — ${ctx.personB}`, page: "4" },
    { num: "4", title: "Analyse Croisée — La dynamique du couple", page: "4" },
    { num: "5", title: "Forces Majeures", page: "5" },
    { num: "6", title: "Points de Vigilance", page: "5" },
    { num: "7", title: "Conseils Personnalisés", page: "6" },
    { num: "8", title: "Conclusion", page: "6" },
  ];

  for (const section of sections) {
    // Numéro
    page.drawText(section.num + ".", {
      x: MARGIN,
      y,
      size: 12,
      font: ctx.helveticaBold,
      color: GOLD,
    });

    // Titre
    page.drawText(section.title, {
      x: MARGIN + 25,
      y,
      size: 12,
      font: ctx.helvetica,
      color: TEXT_COLOR,
    });

    // Pointillés
    const dotStart = MARGIN + 30 + ctx.helvetica.widthOfTextAtSize(section.title, 12);
    const dotEnd = PAGE_WIDTH - MARGIN - 30;
    let dotX = dotStart + 10;
    while (dotX < dotEnd) {
      page.drawText(".", {
        x: dotX,
        y,
        size: 12,
        font: ctx.helvetica,
        color: LIGHT_GOLD,
      });
      dotX += 8;
    }

    // Numéro de page
    page.drawText(section.page, {
      x: PAGE_WIDTH - MARGIN - 10,
      y,
      size: 12,
      font: ctx.helvetica,
      color: GOLD,
    });

    y -= 35;
  }

  // Décoration bas
  page.drawRectangle({
    x: PAGE_WIDTH / 2 - 40,
    y: 100,
    width: 80,
    height: 2,
    color: GOLD,
  });

  ctx.pageNumber = 2; // La table des matières est page 2
}

// ============================================
// PARSING DU RAPPORT LONG
// ============================================
interface ParsedReport {
  introduction: string;
  portraitA: string;
  portraitB: string;
  dynamique: string;
  forces: string;
  vigilance: string;
  conseils: string;
  conclusion: string;
}

function parseReport(report: string): ParsedReport {
  const sections: ParsedReport = {
    introduction: "",
    portraitA: "",
    portraitB: "",
    dynamique: "",
    forces: "",
    vigilance: "",
    conseils: "",
    conclusion: "",
  };

  // Patterns pour identifier les sections
  const patterns = [
    { key: "introduction" as keyof ParsedReport, regex: /(?:1\.|INTRODUCTION)[:\s]*([\s\S]*?)(?=(?:2\.|PORTRAIT|$))/i },
    { key: "portraitA" as keyof ParsedReport, regex: /(?:2\.|PORTRAIT INDIVIDUEL)[^:]*:[:\s]*([\s\S]*?)(?=(?:3\.|PORTRAIT|$))/i },
    { key: "portraitB" as keyof ParsedReport, regex: /(?:3\.|PORTRAIT INDIVIDUEL)[^:]*:[:\s]*([\s\S]*?)(?=(?:4\.|ANALYSE|$))/i },
    { key: "dynamique" as keyof ParsedReport, regex: /(?:4\.|ANALYSE CROIS[ÉE]E|DYNAMIQUE)[^:]*:[:\s]*([\s\S]*?)(?=(?:5\.|FORCES|$))/i },
    { key: "forces" as keyof ParsedReport, regex: /(?:5\.|FORCES MAJEURES)[:\s]*([\s\S]*?)(?=(?:6\.|POINTS|VIGILANCE|$))/i },
    { key: "vigilance" as keyof ParsedReport, regex: /(?:6\.|POINTS DE VIGILANCE)[:\s]*([\s\S]*?)(?=(?:7\.|CONSEILS|$))/i },
    { key: "conseils" as keyof ParsedReport, regex: /(?:7\.|CONSEILS PERSONNALIS[ÉE]S)[:\s]*([\s\S]*?)(?=(?:8\.|CONCLUSION|$))/i },
    { key: "conclusion" as keyof ParsedReport, regex: /(?:8\.|CONCLUSION)[:\s]*([\s\S]*?)$/i },
  ];

  for (const { key, regex } of patterns) {
    const match = report.match(regex);
    if (match && match[1]) {
      sections[key] = match[1].trim();
    }
  }

  // Si le parsing échoue, on divise le texte en sections égales
  if (!sections.introduction && !sections.portraitA) {
    const paragraphs = report.split(/\n\n+/).filter(p => p.trim());
    const perSection = Math.ceil(paragraphs.length / 8);
    
    sections.introduction = paragraphs.slice(0, perSection).join("\n\n");
    sections.portraitA = paragraphs.slice(perSection, perSection * 2).join("\n\n");
    sections.portraitB = paragraphs.slice(perSection * 2, perSection * 3).join("\n\n");
    sections.dynamique = paragraphs.slice(perSection * 3, perSection * 4).join("\n\n");
    sections.forces = paragraphs.slice(perSection * 4, perSection * 5).join("\n\n");
    sections.vigilance = paragraphs.slice(perSection * 5, perSection * 6).join("\n\n");
    sections.conseils = paragraphs.slice(perSection * 6, perSection * 7).join("\n\n");
    sections.conclusion = paragraphs.slice(perSection * 7).join("\n\n");
  }

  return sections;
}

// ============================================
// GÉNÉRATION DU PDF PREMIUM
// ============================================
export interface PremiumPdfParams {
  personA: string;
  dateA: string;
  personB: string;
  dateB: string;
  score: number;
  longReport: string;
}

export async function generatePremiumPdf(
  params: PremiumPdfParams
): Promise<Uint8Array> {
  const { personA, personB, score, longReport } = params;

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  const ctx: PdfContext = {
    pdfDoc,
    helvetica,
    helveticaBold,
    timesRoman,
    timesRomanBold,
    currentPage: null as unknown as PDFPage,
    yPosition: PAGE_HEIGHT - MARGIN,
    pageNumber: 0,
    personA,
    personB,
  };

  // 1. Page de couverture
  createCoverPage(ctx, personA, personB, score);

  // 2. Table des matières
  createTableOfContents(ctx);

  // 3. Parser le rapport
  const parsed = parseReport(longReport);

  // 4. Créer la première page de contenu
  createNewPage(ctx);

  // 5. Section 1 - Introduction
  drawSectionTitle(ctx, "1. Introduction");
  drawParagraph(ctx, parsed.introduction || "L'union entre ces deux êtres révèle une alchimie unique et fascinante...");

  // 6. Section 2 - Portrait A
  drawSectionTitle(ctx, `2. Portrait — ${personA}`);
  drawParagraph(ctx, parsed.portraitA || "Cette personne possède une énergie remarquable...");

  // 7. Section 3 - Portrait B
  drawSectionTitle(ctx, `3. Portrait — ${personB}`);
  drawParagraph(ctx, parsed.portraitB || "L'essence de cette personne se caractérise par...");

  // 8. Section 4 - Dynamique du couple
  drawSectionTitle(ctx, "4. Analyse Croisée — La Dynamique du Couple");
  drawParagraph(ctx, parsed.dynamique || "La rencontre de ces deux énergies crée une dynamique singulière...");

  // 9. Section 5 - Forces Majeures
  drawSectionTitle(ctx, "5. Forces Majeures");
  drawParagraph(ctx, parsed.forces || "Cette union est bénie par plusieurs atouts majeurs...");

  // 10. Section 6 - Points de Vigilance
  drawSectionTitle(ctx, "6. Points de Vigilance");
  drawParagraph(ctx, parsed.vigilance || "Comme toute relation, certains aspects méritent une attention particulière...");

  // 11. Section 7 - Conseils Personnalisés
  drawSectionTitle(ctx, "7. Conseils Personnalisés");
  drawParagraph(ctx, parsed.conseils || "Pour faire prospérer cette relation, voici quelques recommandations...");

  // 12. Section 8 - Conclusion
  drawSectionTitle(ctx, "8. Conclusion");
  drawParagraph(ctx, parsed.conclusion || "Cette analyse révèle un potentiel relationnel riche et prometteur...");

  // Page finale avec disclaimer
  checkNewPage(ctx, 100);
  ctx.yPosition -= 30;

  ctx.currentPage.drawRectangle({
    x: MARGIN,
    y: ctx.yPosition - 60,
    width: CONTENT_WIDTH,
    height: 80,
    color: DARK_ACCENT,
    borderColor: GOLD,
    borderWidth: 1,
  });

  const disclaimerText = "Ce rapport est un outil de réflexion et d'exploration personnelle. Il ne remplace pas un avis professionnel en psychologie ou en conseil conjugal.";
  const disclaimerLines = wrapText(disclaimerText, ctx.helvetica, 10, CONTENT_WIDTH - 30);
  
  let disclaimerY = ctx.yPosition - 20;
  for (const line of disclaimerLines) {
    ctx.currentPage.drawText(line, {
      x: MARGIN + 15,
      y: disclaimerY,
      size: 10,
      font: ctx.helvetica,
      color: LIGHT_GOLD,
    });
    disclaimerY -= 15;
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// ============================================
// FONCTION LEGACY (compatibilité)
// ============================================
export interface PdfParams {
  personA: string;
  dateA: string;
  personB: string;
  dateB: string;
  score: number;
  summary: string;
  strengths: string;
  weaknesses: string;
  advice: string;
}

export async function generateCompatibilityPdf(
  params: PdfParams | PremiumPdfParams
): Promise<Uint8Array> {
  // Si c'est un rapport premium (avec longReport)
  if ("longReport" in params) {
    return generatePremiumPdf(params);
  }

  // Sinon, générer un PDF simplifié à partir des données courtes
  const { personA, dateA, personB, dateB, score, summary, strengths, weaknesses, advice } = params;

  // Construire un rapport texte à partir des données courtes
  const shortReport = `
INTRODUCTION:
${summary}

PORTRAIT INDIVIDUEL — ${personA}:
${personA} apporte à cette union son énergie unique et ses qualités propres.

PORTRAIT INDIVIDUEL — ${personB}:
${personB} complète cette relation avec sa personnalité distinctive.

ANALYSE CROISÉE — LA DYNAMIQUE DU COUPLE:
La rencontre de ces deux êtres crée une alchimie particulière.

FORCES MAJEURES:
${strengths}

POINTS DE VIGILANCE:
${weaknesses}

CONSEILS PERSONNALISÉS:
${advice}

CONCLUSION:
Cette analyse révèle un potentiel relationnel à cultiver avec attention et bienveillance.
`;

  return generatePremiumPdf({
    personA,
    dateA,
    personB,
    dateB,
    score,
    longReport: shortReport,
  });
}
