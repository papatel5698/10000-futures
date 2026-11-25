import { useId, useState } from 'react'
import { BALANCE_LABELS, importBalances, type ImportResult } from '../import/balances'
import { money } from '../format'

interface Props {
  onImport: (balances: ImportResult['balances']) => void
}

/** Reads a balances CSV on this device and pre-fills the balance fields. */
export function BalancesImport({ onImport }: Props) {
  const id = useId()
  const [result, setResult] = useState<ImportResult | null>(null)

  async function onFile(input: HTMLInputElement) {
    const file = input.files?.[0]
    // Clear the input so choosing the same file again (after fixing it, say) fires another change.
    input.value = ''
    if (!file) return
    let text: string
    try {
      text = await file.text()
    } catch {
      setResult({ format: null, balances: {}, accounts: [], errors: [{ line: 0, message: `Couldn't read ${file.name}. Try choosing it again.` }] })
      return
    }
    const r = importBalances(text)
    setResult(r)
    if (r.accounts.length > 0) onImport(r.balances)
  }

  return (
    <div className="import">
      <label htmlFor={id}>Import balances from a CSV</label>
      <input id={id} type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target)} />
      <p className="fine">
        Use a brokerage positions export or the{' '}
        <a href={`${import.meta.env.BASE_URL}samples/balances-template.csv`} download>
          template
        </a>
        . Your file is read on this device and never uploaded.
      </p>
      {/* Always in the page so screen readers announce what an import found. */}
      <div role="status" className="stack">
        {result && result.accounts.length > 0 && (
          <>
            <p>
              Imported {result.accounts.length} account{result.accounts.length === 1 ? '' : 's'}. Check the amounts
              below.
            </p>
            <ul className="import-list">
              {result.accounts.map((a, i) => (
                <li key={i}>
                  {a.name}: {money(a.value)} → {BALANCE_LABELS[a.type]}
                </li>
              ))}
            </ul>
          </>
        )}
        {result && result.errors.length > 0 && (
          <ul className="import-errors">
            {result.errors.map((e, i) => (
              <li key={i}>{e.line > 0 ? `Line ${e.line}: ${e.message}` : e.message}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
