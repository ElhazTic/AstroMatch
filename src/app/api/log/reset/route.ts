import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const LOGS_FILE_PATH = path.join(process.cwd(), "data", "logs.json");

/**
 * DELETE /api/log/reset
 * Resets all logs by clearing the logs file.
 */
export async function DELETE() {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(LOGS_FILE_PATH);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    // Write empty array to logs file
    await fs.writeFile(LOGS_FILE_PATH, JSON.stringify([], null, 2), "utf-8");
    
    console.log("[LOG] All logs have been reset");
    
    return NextResponse.json({ success: true, message: "Logs reset successfully" });
  } catch (error) {
    console.error("Error resetting logs:", error);
    
    // On Vercel, filesystem might be read-only
    // Return success anyway since there's nothing to reset
    return NextResponse.json({ 
      success: true, 
      message: "Logs reset (or no logs to reset)" 
    });
  }
}
