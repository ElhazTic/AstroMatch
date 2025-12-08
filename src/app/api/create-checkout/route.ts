import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";
import { appendLog } from "@/lib/logger";
import { getSessionContext, setSessionCookie, setUTMCookie } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CheckoutRequest {
  email: string;
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CheckoutRequest>;

    // Validation
    const requiredFields: (keyof CheckoutRequest)[] = [
      "email",
      "personA",
      "dateA",
      "personB",
      "dateB",
      "score",
      "summary",
      "strengths",
      "weaknesses",
      "advice",
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json(
          { error: `Le champ ${field} est requis` },
          { status: 400 }
        );
      }
    }

    // Validation email basique
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email!)) {
      return NextResponse.json(
        { error: "Adresse email invalide" },
        { status: 400 }
      );
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";

    // Extract session context with UTM
    const sessionContext = getSessionContext(request);

    // Log checkout session creation with session context
    await appendLog(
      {
        type: "checkout",
        message: "Checkout session created",
        payload: {
          email: body.email!,
          personA: body.personA!,
          personB: body.personB!,
        },
      },
      {
        sessionId: sessionContext.sessionId,
        userAgent: sessionContext.userAgent,
        ipAddress: sessionContext.ipAddress,
        utm: sessionContext.utm,
      }
    );

    // Pass UTM to Stripe metadata for tracking in webhook
    const utmMetadata: Record<string, string> = {};
    if (sessionContext.utm?.source) utmMetadata.utm_source = sessionContext.utm.source;
    if (sessionContext.utm?.medium) utmMetadata.utm_medium = sessionContext.utm.medium;
    if (sessionContext.utm?.campaign) utmMetadata.utm_campaign = sessionContext.utm.campaign;
    if (sessionContext.utm?.content) utmMetadata.utm_content = sessionContext.utm.content;
    if (sessionContext.utm?.term) utmMetadata.utm_term = sessionContext.utm.term;
    if (sessionContext.sessionId) utmMetadata.sessionId = sessionContext.sessionId;

    const url = await createCheckoutSession({
      email: body.email!,
      personA: body.personA!,
      dateA: body.dateA!,
      personB: body.personB!,
      dateB: body.dateB!,
      score: body.score!,
      summary: body.summary!,
      strengths: body.strengths!,
      weaknesses: body.weaknesses!,
      advice: body.advice!,
      successUrl: `${origin}/?success=1`,
      cancelUrl: `${origin}/`,
      ...utmMetadata,
    });

    // Set cookies
    const response = NextResponse.json({ url });
    setSessionCookie(response, sessionContext.sessionId);
    if (sessionContext.isNewUTM && sessionContext.utm) {
      setUTMCookie(response, sessionContext.utm);
    }

    return response;
  } catch (error) {
    console.error("Error in create-checkout API:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "JSON invalide dans la requête" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erreur lors de la création de la session de paiement" },
      { status: 500 }
    );
  }
}

