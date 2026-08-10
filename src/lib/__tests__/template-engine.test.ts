import { interpolateTemplate, InterpolationError } from '../template-engine'

describe('interpolateTemplate', () => {
  // 1. All variables present → correct output
  it('replaces all tokens when all variables are provided', () => {
    const result = interpolateTemplate(
      'Quick Referral Inquiry - {role} at {company_name}',
      { role: 'SDE-1', company_name: 'Troopr Labs' }
    )
    expect(result).toBe('Quick Referral Inquiry - SDE-1 at Troopr Labs')
  })

  it('replaces multiple different tokens in a single template', () => {
    const result = interpolateTemplate(
      'Hi {firstName}, we are looking for a {role} at {company_name}.',
      { firstName: 'Riya', role: 'SDE-1', company_name: 'Troopr Labs' }
    )
    expect(result).toBe('Hi Riya, we are looking for a SDE-1 at Troopr Labs.')
  })

  // 2. Missing variable → throws InterpolationError
  it('throws InterpolationError when a required variable is missing', () => {
    expect(() =>
      interpolateTemplate('Hello {firstName}', {})
    ).toThrow(InterpolationError)
  })

  it('throws InterpolationError with the missing variable name in the message', () => {
    expect(() =>
      interpolateTemplate('Hello {firstName}', {})
    ).toThrow('Missing variable: firstName')
  })

  it('throws InterpolationError even if some variables are provided but one is missing', () => {
    expect(() =>
      interpolateTemplate('{greeting} {firstName}', { greeting: 'Hello' })
    ).toThrow(InterpolationError)
  })

  // 3. Empty template → returns empty string
  it('returns empty string when template is empty', () => {
    expect(interpolateTemplate('', {})).toBe('')
  })

  it('returns empty string for empty template even with extra variables supplied', () => {
    expect(interpolateTemplate('', { name: 'Alice' })).toBe('')
  })

  // 4. No tokens in template → returns template as-is
  it('returns the original template when there are no tokens', () => {
    const plain = 'This is a plain text with no placeholders.'
    expect(interpolateTemplate(plain, {})).toBe(plain)
  })

  it('returns the original template unchanged when extra variables are provided but no tokens exist', () => {
    expect(interpolateTemplate('Hello world', { unused: 'value' })).toBe('Hello world')
  })

  // 5. Multiple occurrences of same token → all replaced
  it('replaces all occurrences of the same token', () => {
    const result = interpolateTemplate(
      '{name} is the best. We love {name}!',
      { name: 'Alice' }
    )
    expect(result).toBe('Alice is the best. We love Alice!')
  })

  it('leaves no unreplaced tokens when the same token appears many times', () => {
    const result = interpolateTemplate(
      '{x} {x} {x}',
      { x: 'hello' }
    )
    expect(result).toBe('hello hello hello')
  })

  // Edge cases
  it('InterpolationError is an instance of Error', () => {
    expect(() =>
      interpolateTemplate('{missing}', {})
    ).toThrow(Error)
  })

  it('preserves non-token curly brace content (digits are not matched)', () => {
    // {123} does not match [a-zA-Z_]+ so it is not a token and stays as-is
    const result = interpolateTemplate('Value: {123}', {})
    expect(result).toBe('Value: {123}')
  })
})
