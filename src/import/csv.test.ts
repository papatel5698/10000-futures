import { describe, expect, it } from 'vitest'
import { CsvError, parseCsv } from './csv'

const cells = (text: string) => parseCsv(text).map((r) => r.cells)

describe('parseCsv', () => {
  it('splits rows and cells', () => {
    expect(cells('a,b\n1,2\n')).toEqual([['a', 'b'], ['1', '2']])
  })

  it('handles CRLF line endings and a byte-order mark', () => {
    expect(cells('\uFEFFa,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']])
  })

  it('keeps commas, escaped quotes and newlines inside quoted cells', () => {
    expect(cells('"$1,000","say ""hi""","two\nlines"')).toEqual([['$1,000', 'say "hi"', 'two\nlines']])
  })

  it('keeps empty cells and blank lines', () => {
    expect(cells('a,,c\n\nx')).toEqual([['a', '', 'c'], [''], ['x']])
  })

  it('returns no rows for an empty file', () => {
    expect(parseCsv('')).toEqual([])
  })

  it('gives each row the physical line it starts on, counting newlines inside quotes', () => {
    expect(parseCsv('h\n"a\nb"\nc\r\n\r\nd').map((r) => r.line)).toEqual([1, 2, 4, 5, 6])
  })

  it('treats a quote inside an unquoted cell as a literal character', () => {
    expect(cells('a"b,c\n5" screen,x')).toEqual([['a"b', 'c'], ['5" screen', 'x']])
  })

  it('reports a quote that is never closed, with the line it opened on', () => {
    expect(() => parseCsv('a,b\nira,"5\nother,6\n')).toThrow(new CsvError('Unclosed quote starting on line 2.', 2))
  })
})
