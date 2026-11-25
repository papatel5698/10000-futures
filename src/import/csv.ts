/** A CSV the parser can't read safely, with the 1-based line where the problem starts. */
export class CsvError extends Error {
  constructor(
    message: string,
    readonly line: number,
  ) {
    super(message)
    this.name = 'CsvError'
  }
}

export interface CsvRow {
  cells: string[]
  /** 1-based physical line the row starts on (quoted cells can span lines). */
  line: number
}

/**
 * RFC 4180 CSV: quoted cells, escaped quotes, CRLF and a leading byte-order mark.
 * A quote only opens a quoted cell at the start of a cell; elsewhere it's a literal character.
 * Throws CsvError for a quote that is never closed, rather than swallowing the rest of the file.
 */
export function parseCsv(text: string): CsvRow[] {
  const s = text.replace(/^\uFEFF/, '')
  const rows: CsvRow[] = []
  let cells: string[] = []
  let cell = ''
  let cellStarted = false
  let quoted = false
  let line = 1
  let rowLine = 1
  let quoteLine = 1
  const endCell = () => {
    cells.push(cell)
    cell = ''
    cellStarted = false
  }
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    const newline = c === '\n' || c === '\r'
    if (newline && c === '\r' && s[i + 1] === '\n') i++
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += newline ? '\n' : c
      if (newline) line++
      continue
    }
    if (c === '"' && !cellStarted) {
      quoted = true
      cellStarted = true
      quoteLine = line
    } else if (c === ',') endCell()
    else if (newline) {
      endCell()
      rows.push({ cells, line: rowLine })
      cells = []
      line++
      rowLine = line
    } else {
      cell += c
      cellStarted = true
    }
  }
  if (quoted) throw new CsvError(`Unclosed quote starting on line ${quoteLine}.`, quoteLine)
  if (cellStarted || cells.length > 0) {
    endCell()
    rows.push({ cells, line: rowLine })
  }
  return rows
}
