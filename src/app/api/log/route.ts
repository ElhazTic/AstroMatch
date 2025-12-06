import { NextRequest, NextResponse } from "next/server";
import { appendLog, readLogs, LogEntry, hasFormForSession } from "@/lib/logger";
import { sendFormAlert } from "@/lib/notifyTelegram";
import { getSessionContext, setSessionCookie, setUTMCookie } from "@/lib/session";

/**
 * POST /api/log
 * Creates a new log entry with session tracking.
 * 
 * Body: { type: string, message: string, payload?: any }
 * 
 * Special handling:
 * - "intent": Always logged, no Telegram, no KPI impact
 * - "form": Deduplicated per session, triggers Telegram only for first submission
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { type, message, payload } = body as {
      type: string;
      message: string;
      payload?: Record<string, unknown>;
    };

    if (!type || !message) {
      return NextResponse.json(
        { error: "Missing required fields: type and message" },
        { status: 400 }
      );
    }

    // Extract session context from request
    const sessionContext = getSessionContext(request);

    // Handle form deduplication
    if (type === "form") {
      // Check if a form was already submitted for this session
      const formExists = await hasFormForSession(sessionContext.sessionId);
      
      if (formExists) {
        console.log(`[LOG] Form duplicate blocked for session ${sessionContext.sessionId.slice(0, 8)}...`);
        
        // Return success but don't log or alert - this is a duplicate
        const response = NextResponse.json(
          { 
            message: "Form already submitted for this session",
            duplicate: true,
            sessionId: sessionContext.sessionId 
          },
          { status: 200 }
        );
        
        return setSessionCookie(response, sessionContext.sessionId);
      }
    }

    // Log the event with session context (includes UTM)
    const logEntry = await appendLog(
      { type, message, payload },
      {
        sessionId: sessionContext.sessionId,
        userAgent: sessionContext.userAgent,
        ipAddress: sessionContext.ipAddress,
        utm: sessionContext.utm,
      }
    );

    // Send Telegram alert ONLY for true form submissions (not intent, not duplicate)
    if (type === "form" && payload?.personA && payload?.personB) {
      sendFormAlert(
        payload.personA as string,
        payload.personB as string
      ).catch((err) => {
        console.error("[Telegram] Failed to send form alert:", err);
      });
    }

    // Note: "intent" type is logged but does NOT trigger Telegram

    // Create response with session cookie
    const response = NextResponse.json(
      { ...logEntry, sessionId: sessionContext.sessionId },
      { status: 201 }
    );
    
    setSessionCookie(response, sessionContext.sessionId);
    
    // Set UTM cookie if this is new UTM data (first-touch attribution)
    if (sessionContext.isNewUTM && sessionContext.utm) {
      setUTMCookie(response, sessionContext.utm);
    }
    
    return response;
  } catch (error) {
    console.error("Error in POST /api/log:", error);
    return NextResponse.json(
      { error: "Failed to create log entry" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/log
 * Returns all log entries.
 */
export async function GET() {
  try {
    const logs: LogEntry[] = await readLogs();
    
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error in GET /api/log:", error);
    return NextResponse.json(
      { error: "Failed to read logs" },
      { status: 500 }
    );
  }
}
