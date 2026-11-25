import { describe, expect, it } from 'vitest'
import { parseCsv } from './csv'

describe('parseCsv', () => {
  it('splits rows and cells', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([['a', 'b'], ['1', '2']])
  })

  it('handles CRLF line endings and a byte-order mark', () => {
    expect(parseCsv('\uFEFFa,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']])
  })

  it('keeps commas, escaped quotes and newlines inside quoted cells', () => {
    expect(parseCsv('"$1,000","say ""hi""","two\nlines"')).toEqual([['$1,000', 'say "hi"', 'two\nlines']])
  })

  it('keeps empty cells and blank lines', () => {
    expect(parseCsv('a,,c\n\nx')).toEqual([['a', '', 'c'], [''], ['x']])
  })

  it('returns no rows for an empty file', () => {
    expect(parseCsv('')).toEqual([])
  })
})
