import * as fc from 'fast-check'
import { buildPrimaryEmail, buildFallbackEmail } from '../email-utils'

describe('buildPrimaryEmail', () => {
  it('returns firstName@domain for a simple name and domain', () => {
    expect(buildPrimaryEmail('Riya', 'troopr.ai')).toBe('riya@troopr.ai')
  })

  it('lowercases mixed-case first names', () => {
    expect(buildPrimaryEmail('JOHN', 'example.com')).toBe('john@example.com')
    expect(buildPrimaryEmail('AlIcE', 'company.io')).toBe('alice@company.io')
  })

  it('trims leading and trailing whitespace from firstName', () => {
    expect(buildPrimaryEmail('  Riya  ', 'troopr.ai')).toBe('riya@troopr.ai')
  })

  it('trims leading and trailing whitespace from domain', () => {
    expect(buildPrimaryEmail('Riya', '  troopr.ai  ')).toBe('riya@troopr.ai')
  })

  it('accepts any valid name string', () => {
    expect(buildPrimaryEmail('anne-marie', 'corp.com')).toBe('anne-marie@corp.com')
    expect(buildPrimaryEmail("o'brien", 'firm.net')).toBe("o'brien@firm.net")
    expect(buildPrimaryEmail('张伟', 'cn.example.com')).toBe('张伟@cn.example.com')
  })
})

describe('buildFallbackEmail', () => {
  it('returns firstName.lastName@domain for simple names and domain', () => {
    expect(buildFallbackEmail('Riya', 'Kumari', 'troopr.ai')).toBe('riya.kumari@troopr.ai')
  })

  it('lowercases mixed-case first and last names', () => {
    expect(buildFallbackEmail('JOHN', 'DOE', 'example.com')).toBe('john.doe@example.com')
    expect(buildFallbackEmail('AlIcE', 'SmItH', 'company.io')).toBe('alice.smith@company.io')
  })

  it('trims leading and trailing whitespace from all parameters', () => {
    expect(buildFallbackEmail('  Riya  ', '  Kumari  ', '  troopr.ai  ')).toBe(
      'riya.kumari@troopr.ai'
    )
  })

  it('accepts any valid name string for both first and last name', () => {
    expect(buildFallbackEmail('anne-marie', 'van-der-berg', 'corp.com')).toBe(
      'anne-marie.van-der-berg@corp.com'
    )
    expect(buildFallbackEmail('o', 'brien', 'firm.net')).toBe('o.brien@firm.net')
  })
})

/**
 * Property 5: Email Address Pattern Consistency
 *
 * For any first name, last name, and company domain:
 *   - primaryEmail  === `${firstName.trim().toLowerCase()}@${domain.trim()}`
 *   - fallbackEmail === `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}@${domain.trim()}`
 *
 * Validates: Requirements 2.5, 12.3
 */
describe('Property 5: Email Address Pattern Consistency', () => {
  // Arbitrary for non-empty strings without leading/trailing whitespace
  // (inputs with internal content only — whitespace-trimming behaviour is
  //  tested in unit tests above; here we verify the core pattern formula).
  const nameArb = fc.stringMatching(/^[^\s].*[^\s]$|^[^\s]$/)
  const domainArb = fc
    .tuple(
      fc.stringMatching(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
      fc.stringMatching(/^[a-z]{2,6}$/)
    )
    .map(([label, tld]) => `${label}.${tld}`)

  it('primaryEmail always equals firstName.toLowerCase()@domain', () => {
    fc.assert(
      fc.property(nameArb, domainArb, (firstName, domain) => {
        const result = buildPrimaryEmail(firstName, domain)
        const expected = `${firstName.trim().toLowerCase()}@${domain.trim()}`
        expect(result).toBe(expected)
      }),
      { numRuns: 100 }
    )
  })

  it('fallbackEmail always equals firstName.toLowerCase().lastName.toLowerCase()@domain', () => {
    fc.assert(
      fc.property(nameArb, nameArb, domainArb, (firstName, lastName, domain) => {
        const result = buildFallbackEmail(firstName, lastName, domain)
        const expected = `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}@${domain.trim()}`
        expect(result).toBe(expected)
      }),
      { numRuns: 100 }
    )
  })

  it('primaryEmail and fallbackEmail always share the same local prefix and domain', () => {
    fc.assert(
      fc.property(nameArb, nameArb, domainArb, (firstName, lastName, domain) => {
        const primary = buildPrimaryEmail(firstName, domain)
        const fallback = buildFallbackEmail(firstName, lastName, domain)

        // Both must end with @<domain>
        expect(primary.endsWith(`@${domain.trim()}`)).toBe(true)
        expect(fallback.endsWith(`@${domain.trim()}`)).toBe(true)

        // fallback local part must start with the primary local part + '.'
        const primaryLocal = primary.split('@')[0]
        const fallbackLocal = fallback.split('@')[0]
        expect(fallbackLocal.startsWith(`${primaryLocal}.`)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})
