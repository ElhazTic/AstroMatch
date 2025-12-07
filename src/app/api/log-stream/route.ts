import { logEmitter } from "@/lib/logEmitter";
import { LogEntry } from "@/lib/logger";
import { maskEmailsInObject } from "@/lib/maskEmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/log-stream
 * Server-Sent Events endpoint for real-time log streaming.
 */
export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", message: "SSE connection established" })}\n\n`)
      );

      // Handler for new log events
      const onLog = (log: LogEntry) => {
        try {
          // Masquer les emails pour la conformité RGPD
          const maskedLog = maskEmailsInObject(log);
          const data = JSON.stringify(maskedLog);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (error) {
          console.error("Error sending SSE event:", error);
        }
      };

      // Subscribe to log events
      logEmitter.on("log", onLog);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() })}\n\n`)
          );
        } catch {
          // Connection might be closed
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Cleanup when the stream is cancelled
      return () => {
        logEmitter.off("log", onLog);
        clearInterval(heartbeatInterval);
      };
    },
    cancel() {
      // Stream was cancelled by client
      console.log("SSE connection closed by client");
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
    },
  });
}



