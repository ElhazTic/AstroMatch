import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";

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
    });

    return NextResponse.json({ url });
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

