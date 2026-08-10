/**
 * Email pattern construction utilities.
 *
 * Validates: Requirements 2.5, 12.3
 */

/**
 * Builds the primary email address for a lead.
 *
 * Pattern: `{firstName.toLowerCase()}@{domain}`
 *
 * @param firstName - Lead's first name (whitespace trimmed before use)
 * @param domain    - Company domain, e.g. "troopr.ai" (whitespace trimmed before use)
 * @returns         Primary email string
 */
export function buildPrimaryEmail(firstName: string, domain: string): string {
  return `${firstName.trim().toLowerCase()}@${domain.trim()}`
}

/**
 * Builds the fallback email address for a lead.
 *
 * Pattern: `{firstName.toLowerCase()}.{lastName.toLowerCase()}@{domain}`
 *
 * @param firstName - Lead's first name (whitespace trimmed before use)
 * @param lastName  - Lead's last name (whitespace trimmed before use)
 * @param domain    - Company domain, e.g. "troopr.ai" (whitespace trimmed before use)
 * @returns         Fallback email string
 */
export function buildFallbackEmail(
  firstName: string,
  lastName: string,
  domain: string
): string {
  return `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}@${domain.trim()}`
}
