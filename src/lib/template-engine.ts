  import type { EmailTemplate } from '@/types'

  // ─── Error Classes ────────────────────────────────────────────────────────────

  /**
   * Thrown when `interpolateTemplate` encounters a `{token}` in the template
   * that has no corresponding key in the variables map.
   * Validates: Requirements 6.2
   */
  export class InterpolationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'InterpolationError'
    }
  }

  /**
   * Thrown when `validateTemplateDeclarations` detects a mismatch between
   * the declared `variables` array and the `{token}` placeholders used in
   * `subjectTemplate` or `bodyTemplate`.
   * Validates: Requirements 5.3, 5.4
   */
  export class TemplateDeclarationError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'TemplateDeclarationError'
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  /**
   * Extracts all unique `{token}` names from a template string.
   * Tokens must match the pattern `{[a-zA-Z_][a-zA-Z0-9_]*}`.
   */
  function extractTokens(template: string): string[] {
    const matches = template.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g) ?? []
    const unique = new Set(matches.map((m) => m.slice(1, -1)))
    return Array.from(unique)
  }

  // ─── interpolateTemplate ──────────────────────────────────────────────────────

  /**
   * Replaces every `{variableName}` placeholder in `template` with the
   * corresponding value from the `variables` map.
   *
   * Preconditions:
   *   - `template` is any string (empty is allowed — returns empty)
   *   - All `{token}` placeholders in `template` have a matching key in `variables`
   *
   * Postconditions:
   *   - Returns a string with no remaining `{...}` tokens
   *   - Each placeholder is replaced exactly once
   *   - Throws `InterpolationError` if any token is missing from `variables`
   *   - Pure function — no side effects on either argument
   *
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4
   */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string>
): string {
  // Normalize variable mapping to allow snake_case and camelCase aliases
  const normalizedVars: Record<string, string> = {
    ...variables,
    first_name: variables.first_name ?? variables.firstName ?? '',
    firstName: variables.firstName ?? variables.first_name ?? '',
    last_name: variables.last_name ?? variables.lastName ?? '',
    lastName: variables.lastName ?? variables.last_name ?? '',
    company_name: variables.company_name ?? variables.companyName ?? '',
    companyName: variables.companyName ?? variables.company_name ?? '',
    role: variables.role ?? variables.target_role ?? variables.targetRole ?? '',
    target_role: variables.target_role ?? variables.role ?? variables.targetRole ?? '',
    targetRole: variables.targetRole ?? variables.role ?? variables.target_role ?? '',
  }

  const tokens = extractTokens(template)

  // Fail fast: validate all tokens are present before making any replacements
  for (const token of tokens) {
    if (normalizedVars[token] === undefined) {
      throw new InterpolationError(
        `Missing variable: "${token}" is required by the template but was not provided`
      )
    }
  }

  // Replace each token using normalized variable lookup
  let result = template
  for (const token of tokens) {
    result = result.replaceAll(`{${token}}`, normalizedVars[token])
  }

  // Postcondition guard: no unreplaced tokens should remain
  if (/\{[a-zA-Z_][a-zA-Z0-9_]*\}/.test(result)) {
    throw new InterpolationError(
      'Unreplaced tokens remain in the output after interpolation'
    )
  }

  return result
}

// ─── validateTemplateDeclarations ────────────────────────────────────────────

/**
 * Validates that an `EmailTemplate` record is internally consistent:
 *
 * 1. Every key in `template.variables` must appear at least once as a
 *    `{token}` placeholder in `subjectTemplate` OR `bodyTemplate`.
 *    (Declared-but-unused variable → TemplateDeclarationError)
 *
 * 2. Every `{token}` placeholder found in `subjectTemplate` or `bodyTemplate`
 *    must be declared in `template.variables`.
 *    (Undeclared token in text → TemplateDeclarationError)
 *
 * Pure validation — no side effects.
 * Validates: Requirements 5.3, 5.4
 */
export function validateTemplateDeclarations(template: EmailTemplate): void {
    const { subjectTemplate, bodyTemplate, variables } = template

    // Collect all tokens used in either template string (deduped)
    const usedTokens = new Set([
      ...extractTokens(subjectTemplate),
      ...extractTokens(bodyTemplate),
    ])

    const declaredVariables = new Set(variables)

    // Check 1 (Req 5.3): every declared variable must appear in the templates
  Array.from(declaredVariables).forEach((declared) => {
    if (!usedTokens.has(declared)) {
      throw new TemplateDeclarationError(
        `Declared variable "${declared}" does not appear in subjectTemplate or bodyTemplate`
      )
    }
  })

  // Check 2 (Req 5.4): every token in the templates must be declared
  Array.from(usedTokens).forEach((used) => {
    if (!declaredVariables.has(used)) {
      throw new TemplateDeclarationError(
        `Token "{${used}}" found in template text but is not declared in the variables array`
      )
    }
  })
  }
