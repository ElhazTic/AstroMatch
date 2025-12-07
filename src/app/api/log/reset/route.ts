import { NextResponse } from "next/server";
import { resetLogs } from "@/lib/logger";

/**
 * DELETE /api/log/reset
 * Resets all logs by clearing the database.
 */
export async function DELETE() {
  try {
    await resetLogs();
    
    console.log("[LOG] All logs have been reset");
    
    return NextResponse.json({ success: true, message: "Logs reset successfully" });
  } catch (error) {
    console.error("Error resetting logs:", error);
    
    return NextResponse.json({ 
      success: false, 
      message: "Failed to reset logs",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
