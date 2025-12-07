import { NextResponse } from "next/server";
import { readLatestEvents } from "@/lib/logger";
import { maskEmailsInObject } from "@/lib/maskEmail";

export const dynamic = "force-dynamic";

/**
 * GET /api/events
 * Returns the latest 200 events from the database.
 * Emails are masked for RGPD compliance.
 */
export async function GET() {
  try {
    const events = await readLatestEvents(200);
    
    // Masquer les emails dans les événements pour la conformité RGPD
    const maskedEvents = events.map((event) => maskEmailsInObject(event));
    
    return NextResponse.json({
      events: maskedEvents,
      count: maskedEvents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in GET /api/events:", error);
    return NextResponse.json(
      { error: "Failed to read events", events: [], count: 0 },
      { status: 500 }
    );
  }
}


