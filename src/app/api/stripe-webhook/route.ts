import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { generatePremiumPdf } from "@/lib/pdf";
import { sendReportEmail } from "@/lib/email";
import { generateLongReport } from "@/lib/generateLongReport";
import { appendLog, SessionContext } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { UTMData } from "@/lib/session";
import {
  sendPaymentAlert,
  sendPdfGeneratedAlert,
  sendErrorAlert,
} from "@/lib/notifyTelegram";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRICE_PER_REPORT = 4.90;
const PRICE_IN_CENTS = 490;

/**
 * Retourne le début de journée (00:00) pour le fuseau du serveur
 */
function getTodayMidnight(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = constructWebhookEvent(body, signature);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    console.log(`Received Stripe event: ${event.type}`);

    // On ne traite que checkout.session.completed
    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    // ---------- 1. Récup metadata ----------
    const metadata = session.metadata;
    if (!metadata) {
      console.error("No metadata found in session");
      return NextResponse.json(
        { error: "No metadata found in session" },
        { status: 400 }
      );
    }

    const {
      email,
      personA,
      dateA,
      personB,
      dateB,
      sessionId,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
    } = metadata;

    if (!email || !personA || !personB || !dateA || !dateB) {
      console.error("Missing required metadata:", {
        email,
        personA,
        personB,
        dateA,
        dateB,
      });
      return NextResponse.json(
        { error: "Missing required metadata" },
        { status: 400 }
      );
    }

    const utm: UTMData | undefined =
      utm_source || utm_medium || utm_campaign || utm_content || utm_term
        ? {
            source: utm_source,
            medium: utm_medium,
            campaign: utm_campaign,
            content: utm_content,
            term: utm_term,
          }
        : undefined;

    const sessionContext: SessionContext | undefined = sessionId
      ? {
          sessionId,
          userAgent: "Stripe Webhook",
          ipAddress: "Stripe",
          utm,
        }
      : undefined;

    console.log(
      `Processing premium payment for ${email} - ${personA} & ${personB}${
        utm?.source ? ` (UTM: ${utm.source})` : ""
      }`
    );

    // ---------- 2. Idempotence : on regarde si ce paiement existe déjà ----------
    const existingPayment = await prisma.payment.findUnique({
      where: { stripeSessionId: session.id },
    });

    if (existingPayment) {
      console.log(
        `[PAYMENT] Stripe session ${session.id} already processed, skipping duplicate work`
      );
      // On log juste, mais on ne refait PAS PDF / email / alert / etc.
      await appendLog(
        {
          type: "payment",
          message: "Payment webhook retried (already processed)",
          payload: { email, personA, personB },
        },
        sessionContext
      );
      return NextResponse.json({ received: true, duplicate: true });
    }

    // ---------- 3. Insertion Payment DB ----------
    try {
      await prisma.payment.create({
        data: {
          stripeSessionId: session.id,
          amount: PRICE_IN_CENTS,
          currency: "eur",
          email,
          personA,
          personB,
          sessionId: sessionId || null,
        },
      });
      console.log("[PAYMENT] Payment inserted into database");
    } catch (dbError) {
      console.error("[PAYMENT] Failed to insert payment:", dbError);
      // on continue quand même, Stripe refera un retry mais l'idempotence plus haut protège
    }

    // ---------- 4. Log "payment" ----------
    await appendLog(
      {
        type: "payment",
        message: "Payment confirmed",
        payload: { email, personA, personB },
      },
      sessionContext
    );

    // ---------- 5. Recalcul CA du jour ----------
    let revenueToday = PRICE_PER_REPORT;
    try {
      const todayMidnight = getTodayMidnight();
      const paymentsToday = await prisma.payment.count({
        where: {
          createdAt: { gte: todayMidnight },
        },
      });
      revenueToday = paymentsToday * PRICE_PER_REPORT;
    } catch (err) {
      console.error("Error calculating today's revenue:", err);
    }

    // ---------- 6. Alerte Telegram paiement + CA ----------
    await sendPaymentAlert(email, personA, personB, revenueToday);

    // ---------- 7. Long report + PDF + email ----------
    try {
      console.log("Generating long premium report via OpenAI...");
      const reportData = await generateLongReport({
        personA,
        dateA,
        personB,
        dateB,
      });

      console.log(
        `Premium report generated - Score: ${reportData.score}, summary length: ${reportData.summary.length}`
      );

      console.log("Generating premium PDF...");
      const pdfBytes = await generatePremiumPdf({
        personA,
        dateA,
        personB,
        dateB,
        score: reportData.score,
        reportData,
      });
      console.log(`Premium PDF generated: ${pdfBytes.length} bytes`);

      await sendPdfGeneratedAlert(personA, personB);

      await appendLog(
        {
          type: "pdf",
          message: "PDF generated & email sent",
          payload: { email, personA, personB, sizeInBytes: pdfBytes.length },
        },
        sessionContext
      );

      console.log(`Sending premium report email to ${email}...`);
      await sendReportEmail({
        to: email,
        personA,
        personB,
        pdfBytes,
      });

      console.log(`✅ Premium report successfully sent to ${email}`);
    } catch (processingError) {
      console.error("❌ Error processing premium payment:", processingError);

      const errorMsg =
        processingError instanceof Error
          ? processingError.message
          : "Unknown error during PDF/email processing";

      await appendLog(
        {
          type: "error",
          message: errorMsg,
          payload: { email, personA, personB },
        },
        sessionContext
      );

      await sendErrorAlert(
        `Payment processing failed for ${email}: ${errorMsg}`
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error in stripe-webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
