/**
 * Telegram Notification System for AstroMatch
 * 
 * Provides various alert functions for payments, PDF generation, errors, 
 * form submissions, traffic spikes, and daily/weekly summaries.
 */

const TELEGRAM_API_URL = "https://api.telegram.org";

/**
 * Core function to send a message via Telegram Bot API.
 * Supports HTML formatting.
 */
export async function notifyTelegram(message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment");
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[Telegram] API error:", response.status, errorData);
      return false;
    }

    console.log("[Telegram] Message sent successfully");
    return true;
  } catch (error) {
    console.error("[Telegram] Failed to send message:", error);
    return false;
  }
}

/**
 * Send a payment alert when a customer completes a purchase.
 */
export async function sendPaymentAlert(
  userEmail: string,
  personA: string,
  personB: string,
  revenueToday: number
): Promise<boolean> {
  const message = `
💸✨ <b>NOUVEAU PAIEMENT — AstroMatch</b>

👤 <b>Client :</b> ${escapeHtml(userEmail)}
💕 <b>Duo :</b> ${escapeHtml(personA)} + ${escapeHtml(personB)}
📄 Rapport envoyé automatiquement

━━━━━━━━━━━━━━━━━━━━━
💰 <b>Total CA aujourd'hui :</b> ${revenueToday.toFixed(2)} €
`.trim();

  return notifyTelegram(message);
}

/**
 * Send an alert when a PDF report is successfully generated.
 */
export async function sendPdfGeneratedAlert(
  personA: string,
  personB: string
): Promise<boolean> {
  const message = `
📄✨ <b>PDF GÉNÉRÉ — AstroMatch</b>

💕 <b>Duo :</b> ${escapeHtml(personA)} + ${escapeHtml(personB)}
✅ Rapport premium créé avec succès

🚀 Le client va le recevoir par email !
`.trim();

  return notifyTelegram(message);
}

/**
 * Send an error alert for critical backend issues.
 */
export async function sendErrorAlert(errorMessage: string): Promise<boolean> {
  const timestamp = new Date().toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "short",
    timeStyle: "medium",
  });

  const message = `
🚨❌ <b>ERREUR — AstroMatch</b>

⏰ <b>Date :</b> ${timestamp}
📛 <b>Message :</b>
<code>${escapeHtml(truncate(errorMessage, 500))}</code>

⚠️ Vérifier les logs !
`.trim();

  return notifyTelegram(message);
}

/**
 * Send an alert when a form is submitted (free analysis requested).
 */
export async function sendFormAlert(
  personA: string,
  personB: string
): Promise<boolean> {
  const message = `
📝💜 <b>NOUVEAU FORMULAIRE — AstroMatch</b>

💕 <b>Duo :</b> ${escapeHtml(personA)} + ${escapeHtml(personB)}
🔮 Analyse gratuite demandée

🎯 Potentiel client premium !
`.trim();

  return notifyTelegram(message);
}

/**
 * Send a traffic spike alert when unusual visitor activity is detected.
 */
export async function sendTrafficSpikeAlert(
  count: number,
  intervalSeconds: number,
  visitorsLast5min: number
): Promise<boolean> {
  const message = `
🚀📈 <b>PIC DE TRAFIC — AstroMatch</b>

⚡ <b>${count} visiteurs</b> en ${intervalSeconds} secondes !
👥 Visiteurs (5 min) : ${visitorsLast5min}

🔥 Le site buzz ! Prépare-toi !
`.trim();

  return notifyTelegram(message);
}

/**
 * Send the daily summary at 23:59.
 */
export async function sendDailySummary(data: {
  visits: number;
  forms: number;
  payments: number;
  revenue: number;
  conversion: number;
}): Promise<boolean> {
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });

  const message = `
🌙📊 <b>RÉCAP QUOTIDIEN — AstroMatch</b>
📅 ${today}

━━━━━━━━━━━━━━━━━━━━━
👀 <b>Visiteurs :</b> ${data.visits}
📝 <b>Formulaires :</b> ${data.forms}
💳 <b>Paiements :</b> ${data.payments}
💰 <b>CA :</b> ${data.revenue.toFixed(2)} €
📈 <b>Conversion :</b> ${data.conversion.toFixed(1)} %
━━━━━━━━━━━━━━━━━━━━━

À demain ✨
`.trim();

  return notifyTelegram(message);
}

/**
 * Send the weekly summary on Sunday at 23:59.
 */
export async function sendWeeklySummary(data: {
  visits: number;
  forms: number;
  payments: number;
  revenue: number;
  conversion: number;
  bestDay: string;
  bestDayRevenue: number;
}): Promise<boolean> {
  const weekRange = getWeekRange();

  const message = `
📆💜 <b>RÉCAP HEBDOMADAIRE — AstroMatch</b>
📅 ${weekRange}

━━━━━━━━━━━━━━━━━━━━━
👀 <b>Visiteurs :</b> ${data.visits}
📝 <b>Formulaires :</b> ${data.forms}
💳 <b>Paiements :</b> ${data.payments}
💰 <b>CA total :</b> ${data.revenue.toFixed(2)} €
📈 <b>Conversion moyenne :</b> ${data.conversion.toFixed(1)} %
━━━━━━━━━━━━━━━━━━━━━

🔥 <b>Meilleure journée :</b> ${data.bestDay}
   └ ${data.bestDayRevenue.toFixed(2)} € de CA

🚀 Continue comme ça !
`.trim();

  return notifyTelegram(message);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Escape HTML special characters for safe Telegram messages.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Truncate a string to a maximum length.
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Get the week range as a formatted string (e.g., "2-8 décembre 2024").
 */
function getWeekRange(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  // Calculate Monday of current week
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  
  // Calculate Sunday of current week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  };

  const mondayStr = monday.toLocaleDateString("fr-FR", { day: "numeric" });
  const sundayStr = sunday.toLocaleDateString("fr-FR", options);

  return `${mondayStr}-${sundayStr}`;
}

// ============================================
// REVENUE CALCULATION HELPER
// ============================================

const PRICE_PER_REPORT = 4.90;

/**
 * Calculate today's revenue from payment logs.
 */
export function calculateTodayRevenue(paymentCount: number): number {
  return paymentCount * PRICE_PER_REPORT;
}

/**
 * Get today's date at midnight (Paris timezone) for filtering logs.
 */
export function getTodayMidnight(): Date {
  const now = new Date();
  const parisOffset = getParisOffset(now);
  const parisNow = new Date(now.getTime() + parisOffset);
  
  parisNow.setHours(0, 0, 0, 0);
  
  return new Date(parisNow.getTime() - parisOffset);
}

/**
 * Get the offset in ms for Paris timezone.
 */
function getParisOffset(date: Date): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const parisDate = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  return parisDate.getTime() - utcDate.getTime();
}

