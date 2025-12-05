import { NextRequest, NextResponse } from "next/server";
import { analyzeCompatibility } from "@/lib/openai";

interface AnalyzeRequest {
  personA: string;
  dateA: string;
  personB: string;
  dateB: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<AnalyzeRequest>;

    // Validation
    if (!body.personA || !body.dateA || !body.personB || !body.dateB) {
      return NextResponse.json(
        {
          error: "Tous les champs sont requis (personA, dateA, personB, dateB)",
        },
        { status: 400 }
      );
    }

    // Validation des dates (format AAAA-MM-JJ)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.dateA) || !dateRegex.test(body.dateB)) {
      return NextResponse.json(
        {
          error: "Les dates doivent être au format AAAA-MM-JJ",
        },
        { status: 400 }
      );
    }

    const analysis = await analyzeCompatibility({
      personA: body.personA,
      dateA: body.dateA,
      personB: body.personB,
      dateB: body.dateB,
    });

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Error in analyze API:", error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "JSON invalide dans la requête" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Une erreur est survenue lors de l'analyse" },
      { status: 500 }
    );
  }
}

