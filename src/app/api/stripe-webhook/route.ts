import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { generateCompatibilityPdf } from "@/lib/pdf";
import { sendReportEmail } from "@/lib/email";
import { generateLongReport } from "@/lib/generateLongReport";
import Stripe from "stripe";

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

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Récupérer les metadata
      const metadata = session.metadata;

      if (!metadata) {
        console.error("No metadata found in session");
        return NextResponse.json(
          { error: "No metadata found in session" },
          { status: 400 }
        );
      }

      const { email, personA, dateA, personB, dateB, score } = metadata;

      // Validation des metadata
      if (!email || !personA || !personB || !dateA || !dateB) {
        console.error("Missing required metadata");
        return NextResponse.json(
          { error: "Missing required metadata" },
          { status: 400 }
        );
      }

      console.log(`Processing premium payment for ${email} - ${personA} & ${personB}`);

      try {
        // 1. Générer le rapport long premium via OpenAI
        console.log("Generating long premium report...");
        const longReport = await generateLongReport({
          personA,
          dateA,
          personB,
          dateB,
        });
        console.log(`Long report generated (${longReport.length} characters)`);

        // 2. Générer le PDF premium avec le rapport long
        console.log("Generating premium PDF...");
        const pdfBytes = await generateCompatibilityPdf({
          personA,
          dateA,
          personB,
          dateB,
          score: parseInt(score || "75", 10),
          longReport,
        });
        console.log(`Premium PDF generated (${pdfBytes.length} bytes)`);

        // 3. Envoyer l'email avec le PDF en pièce jointe
        console.log("Sending email...");
        await sendReportEmail({
          to: email,
          personA,
          personB,
          pdfBytes,
        });

        console.log(`Premium report email sent successfully to ${email}`);
      } catch (processingError) {
        console.error("Error processing premium payment:", processingError);
        // On ne renvoie pas d'erreur à Stripe pour éviter les retry
        // Mais on log pour pouvoir investiguer
      }
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
