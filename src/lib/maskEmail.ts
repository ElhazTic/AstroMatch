/**
 * Masque une adresse email pour la conformité RGPD.
 * Exemple: "olivier@gmail.com" devient "oli***@gmail.com"
 * 
 * @param email - L'adresse email à masquer
 * @returns L'email masqué
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== "string") return email;
  
  const emailRegex = /^([^@]+)@(.+)$/;
  const match = email.match(emailRegex);
  
  if (!match) return email;
  
  const [, localPart, domain] = match;
  
  // Garder les 3 premiers caractères de la partie locale (ou moins si plus courte)
  const visibleChars = Math.min(3, localPart.length);
  const maskedLocal = localPart.slice(0, visibleChars) + "***";
  
  return `${maskedLocal}@${domain}`;
}

/**
 * Vérifie si une chaîne ressemble à une adresse email.
 */
function isEmail(value: string): boolean {
  if (typeof value !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Parcourt récursivement un objet et masque toutes les adresses emails trouvées.
 * 
 * @param obj - L'objet à parcourir
 * @returns Une copie de l'objet avec les emails masqués
 */
export function maskEmailsInObject<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === "string") {
    if (isEmail(obj)) {
      return maskEmail(obj) as T;
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item) => maskEmailsInObject(item)) as T;
  }
  
  if (typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = maskEmailsInObject(value);
    }
    return result as T;
  }
  
  return obj;
}

