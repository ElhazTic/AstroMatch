import { PDFDocument, rgb, PDFPage, PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as fs from "fs";
import * as path from "path";
import { PremiumReportData } from "@/lib/longReportPrompt";

// ============================================
// COULEURS DU THÈME PREMIUM
// ============================================
const COLORS = {
  background: rgb(0.047, 0.059, 0.106),    // #0C0F1B - Fond principal
  darkAccent: rgb(0.078, 0.094, 0.157),    // #141828 - Fond secondaire
  gold: rgb(0.851, 0.643, 0.255),          // #D9A441 - Or principal
  lightGold: rgb(0.918, 0.812, 0.525),     // #EACF86 - Or clair
  text: rgb(0.965, 0.953, 0.933),          // #F6F3EE - Texte principal
  textMuted: rgb(0.7, 0.7, 0.75),          // Texte secondaire
};

// ============================================
// DIMENSIONS ET MARGES
// ============================================
const PAGE = {
  width: 595,
  height: 842,
  marginLeft: 50,
  marginRight: 50,
  marginTop: 50,
  marginBottom: 60,
  headerHeight: 35,
  footerHeight: 35,
};

const CONTENT_WIDTH = PAGE.width - PAGE.marginLeft - PAGE.marginRight;

// ============================================
// TYPOGRAPHIE
// ============================================
const TYPOGRAPHY = {
  // Titres de page
  pageTitle: { size: 28, marginBottom: 18 },
  // Titres de section
  sectionTitle: { size: 16, marginTop: 28, marginBottom: 14 },
  // Sous-titres
  subtitle: { size: 14, marginTop: 20, marginBottom: 10 },
  // Paragraphes
  paragraph: { size: 11, lineHeight: 17, marginBottom: 12 },
  // Texte petit
  small: { size: 10, lineHeight: 14 },
  // Cover
  coverTitle: { size: 42 },
  coverSubtitle: { size: 18 },
  coverNames: { size: 28 },
  coverScore: { size: 48 },
};

// ============================================
// CONTEXTE PDF
// ============================================
interface PdfContext {
  pdfDoc: PDFDocument;
  regularFont: PDFFont;
  boldFont: PDFFont;
  currentPage: PDFPage;
  yPosition: number;
  pageNumber: number;
  totalPages: number;
  personA: string;
  personB: string;
}

// ============================================
// CHARGEMENT DES POLICES UTF-8
// ============================================
async function loadCustomFonts(pdfDoc: PDFDocument): Promise<{ regularFont: PDFFont; boldFont: PDFFont }> {
  let regularFontBytes: Uint8Array;
  let boldFontBytes: Uint8Array;

  // Essayer de charger depuis le système de fichiers (production Vercel ou local)
  try {
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    const regularPath = path.join(fontsDir, "Inter-Regular.ttf");
    const boldPath = path.join(fontsDir, "Inter-Bold.ttf");

    if (fs.existsSync(regularPath) && fs.existsSync(boldPath)) {
      console.log("Loading fonts from filesystem...");
      const regularBuffer = fs.readFileSync(regularPath);
      const boldBuffer = fs.readFileSync(boldPath);
      regularFontBytes = new Uint8Array(regularBuffer);
      boldFontBytes = new Uint8Array(boldBuffer);
    } else {
      throw new Error("Font files not found on filesystem");
    }
  } catch {
    // Fallback: charger via HTTP
    console.log("Loading fonts via HTTP fallback...");
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const [regularRes, boldRes] = await Promise.all([
      fetch(`${baseUrl}/fonts/Inter-Regular.ttf`),
      fetch(`${baseUrl}/fonts/Inter-Bold.ttf`),
    ]);

    if (!regularRes.ok || !boldRes.ok) {
      throw new Error(`Failed to load custom fonts via HTTP: ${regularRes.status}, ${boldRes.status}`);
    }

    regularFontBytes = new Uint8Array(await regularRes.arrayBuffer());
    boldFontBytes = new Uint8Array(await boldRes.arrayBuffer());
  }

  // Embed les polices dans le document PDF
  const regularFont = await pdfDoc.embedFont(regularFontBytes);
  const boldFont = await pdfDoc.embedFont(boldFontBytes);

  console.log("Fonts loaded successfully");
  return { regularFont, boldFont };
}

// ============================================
// NETTOYAGE DE TEXTE UTF-8
// ============================================
function sanitizeText(text: string): string {
  if (!text) return "";

  return text
    // Supprimer les caractères de contrôle
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    // Supprimer zero-width space
    .replace(/\u200B/g, "")
    // Supprimer BOM
    .replace(/\uFEFF/g, "")
    // Remplacer les guillemets typographiques par des guillemets droits
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    // Garder les accents français intacts
    .trim();
}

// ============================================
// WRAPPING DE TEXTE INTELLIGENT
// ============================================
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const sanitized = sanitizeText(text);
  const words = sanitized.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!word) continue;

    const testLine = currentLine ? `${currentLine} ${word}` : word;

    try {
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        
        // Vérifier si le mot seul est trop long
        const wordWidth = font.widthOfTextAtSize(word, fontSize);
        if (wordWidth > maxWidth) {
          // Couper le mot
          let remaining = word;
          while (remaining.length > 0) {
            let cutIndex = remaining.length;
            while (cutIndex > 1 && font.widthOfTextAtSize(remaining.substring(0, cutIndex), fontSize) > maxWidth) {
              cutIndex--;
            }
            lines.push(remaining.substring(0, cutIndex));
            remaining = remaining.substring(cutIndex);
          }
          currentLine = "";
        } else {
          currentLine = word;
        }
      }
    } catch {
      // En cas d'erreur d'encodage, on saute le mot problématique
      console.warn("Could not encode word:", word);
      if (currentLine) lines.push(currentLine);
      currentLine = "";
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [""];
}

// ============================================
// FOND DE PAGE
// ============================================
function drawBackground(page: PDFPage): void {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE.width,
    height: PAGE.height,
    color: COLORS.background,
  });
}

// ============================================
// HEADER
// ============================================
function drawHeader(ctx: PdfContext): void {
  const { currentPage, regularFont } = ctx;

  // Ligne dorée en haut
  currentPage.drawRectangle({
    x: PAGE.marginLeft,
    y: PAGE.height - PAGE.headerHeight,
    width: CONTENT_WIDTH,
    height: 1,
    color: COLORS.gold,
  });

  // Texte header
  const headerText = "AstroMatch - Rapport Premium de Compatibilité";
  currentPage.drawText(headerText, {
    x: PAGE.marginLeft,
    y: PAGE.height - PAGE.headerHeight + 8,
    size: 9,
    font: regularFont,
    color: COLORS.lightGold,
  });
}

// ============================================
// FOOTER AVEC NUMÉRO DE PAGE
// ============================================
function drawFooter(ctx: PdfContext): void {
  const { currentPage, regularFont, pageNumber } = ctx;

  // Ligne dorée en bas
  currentPage.drawRectangle({
    x: PAGE.marginLeft,
    y: PAGE.footerHeight,
    width: CONTENT_WIDTH,
    height: 1,
    color: COLORS.gold,
  });

  // Numéro de page centré
  const pageText = `- ${pageNumber} -`;
  const textWidth = regularFont.widthOfTextAtSize(pageText, 10);
  currentPage.drawText(pageText, {
    x: (PAGE.width - textWidth) / 2,
    y: PAGE.footerHeight - 18,
    size: 10,
    font: regularFont,
    color: COLORS.lightGold,
  });
}

// ============================================
// NOUVELLE PAGE
// ============================================
function createNewPage(ctx: PdfContext, withHeaderFooter = true): void {
  ctx.currentPage = ctx.pdfDoc.addPage([PAGE.width, PAGE.height]);
  ctx.pageNumber++;
  drawBackground(ctx.currentPage);

  if (withHeaderFooter) {
    drawHeader(ctx);
    drawFooter(ctx);
    ctx.yPosition = PAGE.height - PAGE.marginTop - PAGE.headerHeight - 10;
  } else {
    ctx.yPosition = PAGE.height - PAGE.marginTop;
  }
}

// ============================================
// VÉRIFICATION DE NOUVELLE PAGE
// ============================================
function checkNewPage(ctx: PdfContext, requiredSpace: number): void {
  const minY = PAGE.marginBottom + PAGE.footerHeight + 10;
  if (ctx.yPosition - requiredSpace < minY) {
    createNewPage(ctx);
  }
}

// ============================================
// TITRE DE SECTION
// ============================================
function addSectionTitle(ctx: PdfContext, title: string, sectionNumber?: number): void {
  checkNewPage(ctx, 80);

  const { currentPage, boldFont } = ctx;
  const sanitizedTitle = sanitizeText(title);

  ctx.yPosition -= TYPOGRAPHY.sectionTitle.marginTop;

  // Ligne décorative au-dessus
  currentPage.drawRectangle({
    x: PAGE.marginLeft,
    y: ctx.yPosition + 8,
    width: 50,
    height: 2,
    color: COLORS.gold,
  });

  ctx.yPosition -= 5;

  // Titre
  const displayTitle = sectionNumber ? `${sectionNumber}. ${sanitizedTitle}` : sanitizedTitle;
  currentPage.drawText(displayTitle.toUpperCase(), {
    x: PAGE.marginLeft,
    y: ctx.yPosition,
    size: TYPOGRAPHY.sectionTitle.size,
    font: boldFont,
    color: COLORS.gold,
  });

  ctx.yPosition -= TYPOGRAPHY.sectionTitle.marginBottom;
}

// ============================================
// SOUS-TITRE (exporté pour usage futur)
// ============================================
export function addSubtitle(ctx: PdfContext, subtitle: string): void {
  checkNewPage(ctx, 40);

  const { currentPage, boldFont } = ctx;
  const sanitizedSubtitle = sanitizeText(subtitle);

  ctx.yPosition -= TYPOGRAPHY.subtitle.marginTop;

  currentPage.drawText(sanitizedSubtitle, {
    x: PAGE.marginLeft,
    y: ctx.yPosition,
    size: TYPOGRAPHY.subtitle.size,
    font: boldFont,
    color: COLORS.lightGold,
  });

  ctx.yPosition -= TYPOGRAPHY.subtitle.marginBottom;
}

// ============================================
// PARAGRAPHE AVEC WRAPPING AUTOMATIQUE
// ============================================
function addParagraph(
  ctx: PdfContext,
  text: string,
  options: { fontSize?: number; lineHeight?: number; color?: typeof COLORS.text } = {}
): void {
  const fontSize = options.fontSize || TYPOGRAPHY.paragraph.size;
  const lineHeight = options.lineHeight || TYPOGRAPHY.paragraph.lineHeight;
  const color = options.color || COLORS.text;

  const { regularFont } = ctx;
  const sanitizedText = sanitizeText(text);

  // Séparer par paragraphes (double saut de ligne ou point suivi de majuscule)
  const paragraphs = sanitizedText.split(/\n\n+/);

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;

    const lines = wrapText(paragraph, regularFont, fontSize, CONTENT_WIDTH);

    for (const line of lines) {
      checkNewPage(ctx, lineHeight + 5);

      try {
        ctx.currentPage.drawText(line, {
          x: PAGE.marginLeft,
          y: ctx.yPosition,
          size: fontSize,
          font: regularFont,
          color,
        });
      } catch (err) {
        console.warn("Could not render line:", line, err);
      }
      ctx.yPosition -= lineHeight;
    }

    // Espace entre paragraphes
    ctx.yPosition -= 6;
  }

  ctx.yPosition -= TYPOGRAPHY.paragraph.marginBottom - 6;
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
  const page = ctx.pdfDoc.addPage([PAGE.width, PAGE.height]);
  ctx.currentPage = page;
  ctx.pageNumber = 0;

  drawBackground(page);

  // Bande décorative en haut
  page.drawRectangle({
    x: 0,
    y: PAGE.height - 100,
    width: PAGE.width,
    height: 100,
    color: COLORS.darkAccent,
  });

  // Ligne dorée sous la bande
  page.drawRectangle({
    x: PAGE.marginLeft,
    y: PAGE.height - 102,
    width: CONTENT_WIDTH,
    height: 2,
    color: COLORS.gold,
  });

  // Logo / Titre ASTROMATCH
  const titleText = "ASTROMATCH";
  const titleWidth = ctx.boldFont.widthOfTextAtSize(titleText, TYPOGRAPHY.coverTitle.size);
  page.drawText(titleText, {
    x: (PAGE.width - titleWidth) / 2,
    y: PAGE.height - 180,
    size: TYPOGRAPHY.coverTitle.size,
    font: ctx.boldFont,
    color: COLORS.gold,
  });

  // Sous-titre
  const subtitleText = "Analyse Premium de Compatibilité Amoureuse";
  const subtitleWidth = ctx.regularFont.widthOfTextAtSize(subtitleText, TYPOGRAPHY.coverSubtitle.size);
  page.drawText(subtitleText, {
    x: (PAGE.width - subtitleWidth) / 2,
    y: PAGE.height - 215,
    size: TYPOGRAPHY.coverSubtitle.size,
    font: ctx.regularFont,
    color: COLORS.lightGold,
  });

  // Ligne décorative centrale
  page.drawRectangle({
    x: PAGE.width / 2 - 100,
    y: PAGE.height - 270,
    width: 200,
    height: 1,
    color: COLORS.gold,
  });

  // Petit symbole décoratif
  const starSymbol = "✦";
  const starWidth = ctx.regularFont.widthOfTextAtSize(starSymbol, 18);
  page.drawText(starSymbol, {
    x: (PAGE.width - starWidth) / 2,
    y: PAGE.height - 290,
    size: 18,
    font: ctx.regularFont,
    color: COLORS.gold,
  });

  // Noms des personnes
  const sanitizedA = sanitizeText(personA);
  const sanitizedB = sanitizeText(personB);
  const namesText = `${sanitizedA} & ${sanitizedB}`;
  const namesWidth = ctx.boldFont.widthOfTextAtSize(namesText, TYPOGRAPHY.coverNames.size);
  page.drawText(namesText, {
    x: (PAGE.width - namesWidth) / 2,
    y: PAGE.height - 360,
    size: TYPOGRAPHY.coverNames.size,
    font: ctx.boldFont,
    color: COLORS.text,
  });

  // Cadre du score
  const scoreY = PAGE.height - 500;
  const scoreBoxWidth = 180;
  const scoreBoxHeight = 120;

  // Fond du cadre
  page.drawRectangle({
    x: (PAGE.width - scoreBoxWidth) / 2,
    y: scoreY - scoreBoxHeight / 2,
    width: scoreBoxWidth,
    height: scoreBoxHeight,
    color: COLORS.darkAccent,
    borderColor: COLORS.gold,
    borderWidth: 2,
  });

  // Label "Score de Compatibilité"
  const scoreLabelText = "SCORE DE COMPATIBILITÉ";
  const scoreLabelWidth = ctx.regularFont.widthOfTextAtSize(scoreLabelText, 10);
  page.drawText(scoreLabelText, {
    x: (PAGE.width - scoreLabelWidth) / 2,
    y: scoreY + 35,
    size: 10,
    font: ctx.regularFont,
    color: COLORS.lightGold,
  });

  // Score en grand
  const scoreText = `${score}%`;
  const scoreWidth = ctx.boldFont.widthOfTextAtSize(scoreText, TYPOGRAPHY.coverScore.size);
  page.drawText(scoreText, {
    x: (PAGE.width - scoreWidth) / 2,
    y: scoreY - 10,
    size: TYPOGRAPHY.coverScore.size,
    font: ctx.boldFont,
    color: COLORS.gold,
  });

  // Bande décorative en bas
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE.width,
    height: 80,
    color: COLORS.darkAccent,
  });

  page.drawRectangle({
    x: PAGE.marginLeft,
    y: 80,
    width: CONTENT_WIDTH,
    height: 2,
    color: COLORS.gold,
  });

  // Copyright
  const year = new Date().getFullYear();
  const copyrightText = `© ${year} AstroMatch - Tous droits réservés`;
  const copyrightWidth = ctx.regularFont.widthOfTextAtSize(copyrightText, 9);
  page.drawText(copyrightText, {
    x: (PAGE.width - copyrightWidth) / 2,
    y: 40,
    size: 9,
    font: ctx.regularFont,
    color: COLORS.lightGold,
  });
}

// ============================================
// TABLE DES MATIÈRES
// ============================================
function createTableOfContents(ctx: PdfContext): void {
  createNewPage(ctx, false);
  const page = ctx.currentPage;
  drawBackground(page);

  let y = PAGE.height - 80;

  // Titre
  const tocTitle = "TABLE DES MATIÈRES";
  const tocTitleWidth = ctx.boldFont.widthOfTextAtSize(tocTitle, 24);
  page.drawText(tocTitle, {
    x: (PAGE.width - tocTitleWidth) / 2,
    y,
    size: 24,
    font: ctx.boldFont,
    color: COLORS.gold,
  });

  y -= 20;

  // Ligne décorative
  page.drawRectangle({
    x: PAGE.width / 2 - 80,
    y,
    width: 160,
    height: 2,
    color: COLORS.gold,
  });

  y -= 60;

  const sections = [
    { num: "1", title: "Introduction" },
    { num: "2", title: `Portrait de ${sanitizeText(ctx.personA)}` },
    { num: "3", title: `Portrait de ${sanitizeText(ctx.personB)}` },
    { num: "4", title: "Dynamique du Couple" },
    { num: "5", title: "Forces de l'Union" },
    { num: "6", title: "Points de Vigilance" },
    { num: "7", title: "Conseils Personnalisés" },
    { num: "8", title: "Conclusion" },
  ];

  for (const section of sections) {
    // Numéro
    page.drawText(section.num + ".", {
      x: PAGE.marginLeft,
      y,
      size: 12,
      font: ctx.boldFont,
      color: COLORS.gold,
    });

    // Titre
    page.drawText(section.title, {
      x: PAGE.marginLeft + 25,
      y,
      size: 12,
      font: ctx.regularFont,
      color: COLORS.text,
    });

    // Pointillés
    const titleWidth = ctx.regularFont.widthOfTextAtSize(section.title, 12);
    const dotStart = PAGE.marginLeft + 30 + titleWidth;
    const dotEnd = PAGE.width - PAGE.marginRight - 10;
    let dotX = dotStart + 10;

    while (dotX < dotEnd) {
      page.drawText(".", {
        x: dotX,
        y,
        size: 12,
        font: ctx.regularFont,
        color: COLORS.lightGold,
      });
      dotX += 8;
    }

    y -= 35;
  }

  // Décoration bas
  page.drawRectangle({
    x: PAGE.width / 2 - 40,
    y: 120,
    width: 80,
    height: 2,
    color: COLORS.gold,
  });

  ctx.pageNumber = 2;
}

// ============================================
// DISCLAIMER FINAL
// ============================================
function addDisclaimer(ctx: PdfContext): void {
  checkNewPage(ctx, 120);

  ctx.yPosition -= 30;

  // Cadre du disclaimer
  const disclaimerHeight = 80;
  ctx.currentPage.drawRectangle({
    x: PAGE.marginLeft,
    y: ctx.yPosition - disclaimerHeight + 20,
    width: CONTENT_WIDTH,
    height: disclaimerHeight,
    color: COLORS.darkAccent,
    borderColor: COLORS.gold,
    borderWidth: 1,
  });

  const disclaimerText = 
    "Ce rapport est un outil de réflexion et d'exploration personnelle. " +
    "Il ne remplace en aucun cas un avis professionnel en psychologie, " +
    "en thérapie de couple ou en conseil conjugal. Les interprétations " +
    "astrologiques sont proposées à titre indicatif et ludique.";

  const disclaimerLines = wrapText(disclaimerText, ctx.regularFont, 10, CONTENT_WIDTH - 30);

  let disclaimerY = ctx.yPosition;
  for (const line of disclaimerLines) {
    ctx.currentPage.drawText(line, {
      x: PAGE.marginLeft + 15,
      y: disclaimerY,
      size: 10,
      font: ctx.regularFont,
      color: COLORS.lightGold,
    });
    disclaimerY -= 14;
  }
}

// ============================================
// INTERFACE PUBLIQUE
// ============================================
export interface PremiumPdfParams {
  personA: string;
  dateA: string;
  personB: string;
  dateB: string;
  score: number;
  reportData: PremiumReportData;
}

/**
 * Génère un PDF premium à partir des données structurées du rapport
 */
export async function generatePremiumPdf(params: PremiumPdfParams): Promise<Uint8Array> {
  const { personA, personB, score, reportData } = params;

  console.log("Starting premium PDF generation...");

  const pdfDoc = await PDFDocument.create();

  // Enregistrer fontkit pour les polices personnalisées
  pdfDoc.registerFontkit(fontkit);

  // Charger les polices UTF-8 (Inter)
  const { regularFont, boldFont } = await loadCustomFonts(pdfDoc);

  const ctx: PdfContext = {
    pdfDoc,
    regularFont,
    boldFont,
    currentPage: null as unknown as PDFPage,
    yPosition: PAGE.height - PAGE.marginTop,
    pageNumber: 0,
    totalPages: 0,
    personA,
    personB,
  };

  // 1. Page de couverture
  createCoverPage(ctx, personA, personB, score);

  // 2. Table des matières
  createTableOfContents(ctx);

  // 3. Première page de contenu
  createNewPage(ctx);

  // === SECTION 1: Introduction ===
  addSectionTitle(ctx, "Introduction", 1);
  addParagraph(ctx, reportData.summary);

  // === SECTION 2: Portrait A ===
  addSectionTitle(ctx, `Portrait de ${sanitizeText(personA)}`, 2);
  addParagraph(ctx, reportData.portraitA);

  // === SECTION 3: Portrait B ===
  addSectionTitle(ctx, `Portrait de ${sanitizeText(personB)}`, 3);
  addParagraph(ctx, reportData.portraitB);

  // === SECTION 4: Dynamique du Couple ===
  addSectionTitle(ctx, "Dynamique du Couple", 4);
  addParagraph(ctx, reportData.coupleDynamic);

  // === SECTION 5: Forces de l'Union ===
  addSectionTitle(ctx, "Forces de l'Union", 5);
  addParagraph(ctx, reportData.strengths);

  // === SECTION 6: Points de Vigilance ===
  addSectionTitle(ctx, "Points de Vigilance", 6);
  addParagraph(ctx, reportData.weaknesses);

  // === SECTION 7: Conseils Personnalisés ===
  addSectionTitle(ctx, "Conseils Personnalisés", 7);
  addParagraph(ctx, reportData.advice);

  // === SECTION 8: Conclusion ===
  addSectionTitle(ctx, "Conclusion", 8);
  addParagraph(ctx, reportData.conclusion);

  // === Disclaimer ===
  addDisclaimer(ctx);

  // Sauvegarder le PDF
  const pdfBytes = await pdfDoc.save();

  console.log(`Premium PDF generated: ${pdfBytes.length} bytes, ${ctx.pageNumber} pages`);

  return pdfBytes;
}

// ============================================
// INTERFACE LEGACY (compatibilité)
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

/**
 * Fonction legacy pour la compatibilité avec l'ancienne interface
 */
export async function generateCompatibilityPdf(
  params: PdfParams | (Omit<PremiumPdfParams, 'reportData'> & { reportData?: PremiumReportData })
): Promise<Uint8Array> {
  // Si reportData est fourni, utiliser le nouveau système
  if ("reportData" in params && params.reportData) {
    return generatePremiumPdf(params as PremiumPdfParams);
  }

  // Sinon, construire un reportData minimal à partir des anciennes données
  const legacyParams = params as PdfParams;
  const minimalReportData: PremiumReportData = {
    score: legacyParams.score,
    summary: legacyParams.summary || "Analyse de compatibilité amoureuse.",
    portraitA: `${legacyParams.personA} apporte à cette union son énergie unique et ses qualités propres. Sa personnalité enrichit la dynamique du couple de manière significative.`,
    portraitB: `${legacyParams.personB} complète cette relation avec sa personnalité distinctive et ses forces complémentaires.`,
    coupleDynamic: "La rencontre de ces deux êtres crée une alchimie unique et fascinante.",
    strengths: legacyParams.strengths || "Cette union possède de nombreuses forces.",
    weaknesses: legacyParams.weaknesses || "Quelques points méritent une attention particulière.",
    advice: legacyParams.advice || "Cultivez la communication et la bienveillance.",
    conclusion: "Cette analyse révèle un potentiel relationnel riche et prometteur.",
  };

  return generatePremiumPdf({
    personA: legacyParams.personA,
    dateA: legacyParams.dateA,
    personB: legacyParams.personB,
    dateB: legacyParams.dateB,
    score: legacyParams.score,
    reportData: minimalReportData,
  });
}
