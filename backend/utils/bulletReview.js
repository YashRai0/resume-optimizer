function normalizeText(value) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function numericClaims(value) {
  return (value.match(/(?:[$₹€£]\s*)?\b\d[\d,]*(?:\.\d+)?\s?(?:%|percent|years?|months?|days?|users?|clients?|k|m|b)?\b/gi) || [])
    .map(item => item.toLowerCase().replace(/\s+/g, ''))
}

export function reviewBulletSuggestion({ sourceText, original, optimized }) {
  const flags = []
  const normalizedSource = normalizeText(sourceText || '')
  if (!original || !normalizedSource.includes(normalizeText(original))) {
    flags.push('original_not_found_in_source')
  }

  const sourceNumbers = new Set(numericClaims(sourceText || ''))
  const introducedNumbers = numericClaims(optimized || '').filter(value => !sourceNumbers.has(value))
  if (introducedNumbers.length > 0) flags.push('new_quantitative_detail')
  return flags
}
