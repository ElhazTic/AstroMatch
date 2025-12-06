import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "sessionId";
const UTM_COOKIE_NAME = "utm_data";
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds
const UTM_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days in seconds

/**
 * UTM parameters for marketing tracking
 */
export interface UTMData {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

/**
 * Extracts UTM parameters from a URL search params or request.
 * 
 * @param searchParams - URLSearchParams or NextRequest
 * @returns UTM data object (only includes non-empty values)
 */
export function extractUTMFromParams(searchParams: URLSearchParams): UTMData | undefined {
  const source = searchParams.get("utm_source");
  const medium = searchParams.get("utm_medium");
  const campaign = searchParams.get("utm_campaign");
  const content = searchParams.get("utm_content");
  const term = searchParams.get("utm_term");

  // Only return if at least one UTM param is present
  if (!source && !medium && !campaign && !content && !term) {
    return undefined;
  }

  const utm: UTMData = {};
  if (source) utm.source = source;
  if (medium) utm.medium = medium;
  if (campaign) utm.campaign = campaign;
  if (content) utm.content = content;
  if (term) utm.term = term;

  return utm;
}

/**
 * Extracts UTM parameters from request URL.
 * 
 * @param req - The NextRequest object
 * @returns UTM data object or undefined
 */
export function extractUTMFromRequest(req: NextRequest): UTMData | undefined {
  const url = new URL(req.url);
  return extractUTMFromParams(url.searchParams);
}

/**
 * Gets stored UTM data from request cookies.
 * Uses first-touch attribution (returns existing UTM if present).
 * 
 * @param req - The NextRequest object
 * @returns UTM data object or undefined
 */
export function getStoredUTM(req: NextRequest): UTMData | undefined {
  const utmCookie = req.cookies.get(UTM_COOKIE_NAME)?.value;
  if (!utmCookie) return undefined;

  try {
    return JSON.parse(utmCookie) as UTMData;
  } catch {
    return undefined;
  }
}

/**
 * Sets UTM data in response cookies.
 * Uses first-touch attribution (only sets if not already present).
 * 
 * @param response - The NextResponse object
 * @param utm - UTM data to store
 * @returns The modified NextResponse with cookie set
 */
export function setUTMCookie(response: NextResponse, utm: UTMData): NextResponse {
  response.cookies.set({
    name: UTM_COOKIE_NAME,
    value: JSON.stringify(utm),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: UTM_COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}

/**
 * Gets or creates a session ID from the request cookies.
 * If no session exists, generates a new UUID.
 * 
 * @param req - The NextRequest object (optional, for API routes)
 * @returns The session ID string
 */
export function getSessionId(req?: NextRequest): string {
  // Try to get existing session from request cookies
  if (req) {
    const existingSession = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (existingSession) {
      return existingSession;
    }
  }

  // Generate new session ID
  return crypto.randomUUID();
}

/**
 * Extracts user agent from request headers.
 * 
 * @param req - The NextRequest object
 * @returns The user agent string or "Unknown"
 */
export function getUserAgent(req: NextRequest): string {
  return req.headers.get("user-agent") || "Unknown";
}

/**
 * Extracts IP address from request headers.
 * Checks various headers that might contain the real IP (for proxied requests).
 * 
 * @param req - The NextRequest object
 * @returns The IP address string or "Unknown"
 */
export function getIpAddress(req: NextRequest): string {
  // Check common headers for real IP (used by proxies/load balancers)
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one (client IP)
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Vercel-specific header
  const vercelForwardedFor = req.headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(",")[0].trim();
  }

  return "Unknown";
}

/**
 * Creates a response with the session cookie set.
 * Use this to wrap your API responses to ensure the session cookie is set.
 * 
 * @param response - The NextResponse object
 * @param sessionId - The session ID to set in the cookie
 * @returns The modified NextResponse with cookie set
 */
export function setSessionCookie(response: NextResponse, sessionId: string): NextResponse {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}

/**
 * Extracts session context from a request.
 * Combines session ID, user agent, IP address, and UTM data.
 * 
 * @param req - The NextRequest object
 * @returns Object containing sessionId, userAgent, ipAddress, utm, and isNewSession
 */
export function getSessionContext(req: NextRequest): {
  sessionId: string;
  userAgent: string;
  ipAddress: string;
  isNewSession: boolean;
  utm?: UTMData;
  isNewUTM: boolean;
} {
  const existingSession = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionId = existingSession || crypto.randomUUID();
  
  // Get UTM - first check cookie (first-touch attribution), then URL params
  const storedUTM = getStoredUTM(req);
  const newUTM = extractUTMFromRequest(req);
  
  // Use stored UTM if exists (first-touch), otherwise use new UTM from URL
  const utm = storedUTM || newUTM;
  const isNewUTM = !storedUTM && !!newUTM;
  
  return {
    sessionId,
    userAgent: getUserAgent(req),
    ipAddress: getIpAddress(req),
    isNewSession: !existingSession,
    utm,
    isNewUTM,
  };
}

/**
 * Extended session context including UTM for logging.
 */
export interface SessionContextWithUTM {
  sessionId: string;
  userAgent: string;
  ipAddress: string;
  utm?: UTMData;
}

