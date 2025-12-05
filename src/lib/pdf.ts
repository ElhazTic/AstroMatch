import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

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

// Couleurs du thème
const DARK_BLUE = rgb(0.02, 0.03, 0.09); // #050818
const GOLD = rgb(0.98, 0.85, 0.5);
const WHITE = rgb(1, 1, 1);
const LIGHT_GOLD = rgb(0.98, 0.9, 0.7);

// Fonction pour wrapper le texte
function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const avgCharWidth = fontSize * 0.5;
  const maxChars = Math.floor(maxWidth / avgCharWidth);
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxChars) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

export async function generateCompatibilityPdf(
  params: PdfParams
): Promise<Uint8Array> {
  const {
    personA,
    dateA,
    personB,
    dateB,
    score,
    summary,
    strengths,
    weaknesses,
    advice,
  } = params;

  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  // Fonction pour ajouter une nouvelle page si nécessaire
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition - requiredSpace < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      // Fond de page
      page.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
        color: DARK_BLUE,
      });
      yPosition = pageHeight - margin;
    }
  };

  // Fond de la première page
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: DARK_BLUE,
  });

  // === HEADER ===
  // Logo/Titre
  page.drawText("ASTROMATCH", {
    x: margin,
    y: yPosition,
    size: 28,
    font: helveticaBold,
    color: GOLD,
  });
  yPosition -= 20;

  page.drawText("Rapport de Compatibilite Amoureuse", {
    x: margin,
    y: yPosition,
    size: 12,
    font: helvetica,
    color: LIGHT_GOLD,
  });
  yPosition -= 50;

  // Ligne décorative
  page.drawRectangle({
    x: margin,
    y: yPosition,
    width: contentWidth,
    height: 2,
    color: GOLD,
  });
  yPosition -= 40;

  // === NOMS DES PERSONNES ===
  const titleText = `${personA} & ${personB}`;
  page.drawText(titleText, {
    x: margin,
    y: yPosition,
    size: 24,
    font: helveticaBold,
    color: WHITE,
  });
  yPosition -= 30;

  // Dates de naissance
  page.drawText(`Ne(e) le ${dateA}`, {
    x: margin,
    y: yPosition,
    size: 11,
    font: helvetica,
    color: LIGHT_GOLD,
  });

  page.drawText(`Ne(e) le ${dateB}`, {
    x: margin + 200,
    y: yPosition,
    size: 11,
    font: helvetica,
    color: LIGHT_GOLD,
  });
  yPosition -= 50;

  // === SCORE ===
  page.drawText("SCORE DE COMPATIBILITE", {
    x: margin,
    y: yPosition,
    size: 14,
    font: helveticaBold,
    color: GOLD,
  });
  yPosition -= 40;

  // Grand score
  page.drawText(`${score}/100`, {
    x: margin,
    y: yPosition,
    size: 48,
    font: helveticaBold,
    color: GOLD,
  });
  yPosition -= 50;

  // === RÉSUMÉ ===
  checkNewPage(100);
  page.drawText("RESUME GENERAL", {
    x: margin,
    y: yPosition,
    size: 14,
    font: helveticaBold,
    color: GOLD,
  });
  yPosition -= 25;

  const summaryLines = wrapText(summary, contentWidth, 11);
  for (const line of summaryLines) {
    checkNewPage(20);
    page.drawText(line, {
      x: margin,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: WHITE,
    });
    yPosition -= 18;
  }
  yPosition -= 30;

  // === FORCES ===
  checkNewPage(100);
  page.drawText("FORCES DE VOTRE RELATION", {
    x: margin,
    y: yPosition,
    size: 14,
    font: helveticaBold,
    color: GOLD,
  });
  yPosition -= 25;

  const strengthLines = wrapText(strengths, contentWidth, 11);
  for (const line of strengthLines) {
    checkNewPage(20);
    page.drawText(line, {
      x: margin,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: WHITE,
    });
    yPosition -= 18;
  }
  yPosition -= 30;

  // === POINTS DE VIGILANCE ===
  checkNewPage(100);
  page.drawText("POINTS DE VIGILANCE", {
    x: margin,
    y: yPosition,
    size: 14,
    font: helveticaBold,
    color: GOLD,
  });
  yPosition -= 25;

  const weaknessLines = wrapText(weaknesses, contentWidth, 11);
  for (const line of weaknessLines) {
    checkNewPage(20);
    page.drawText(line, {
      x: margin,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: WHITE,
    });
    yPosition -= 18;
  }
  yPosition -= 30;

  // === CONSEILS ===
  checkNewPage(100);
  page.drawText("CONSEILS POUR L'AVENIR", {
    x: margin,
    y: yPosition,
    size: 14,
    font: helveticaBold,
    color: GOLD,
  });
  yPosition -= 25;

  const adviceLines = wrapText(advice, contentWidth, 11);
  for (const line of adviceLines) {
    checkNewPage(20);
    page.drawText(line, {
      x: margin,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: WHITE,
    });
    yPosition -= 18;
  }
  yPosition -= 40;

  // === FOOTER ===
  checkNewPage(60);
  page.drawRectangle({
    x: margin,
    y: yPosition,
    width: contentWidth,
    height: 1,
    color: GOLD,
  });
  yPosition -= 20;

  const footerText =
    "Ce rapport est un outil de reflexion et ne constitue pas un avis professionnel.";
  page.drawText(footerText, {
    x: margin,
    y: yPosition,
    size: 9,
    font: helvetica,
    color: LIGHT_GOLD,
  });
  yPosition -= 15;

  page.drawText("AstroMatch - Tous droits reserves", {
    x: margin,
    y: yPosition,
    size: 9,
    font: helvetica,
    color: LIGHT_GOLD,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

