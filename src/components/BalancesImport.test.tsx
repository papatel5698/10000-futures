// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BalancesImport } from './BalancesImport'

afterEach(cleanup)

// jsdom has no Blob.text() (every current browser does); read through FileReader instead.
Blob.prototype.text ??= function (this: Blob) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsText(this)
  })
}

const choose = (text: string, name = 'balances.csv') =>
  fireEvent.change(screen.getByLabelText(/import balances from a csv/i), {
    target: { files: [new File([text], name, { type: 'text/csv' })] },
  })

describe('BalancesImport', () => {
  it('says the file stays on the device and links the template', () => {
    render(<BalancesImport onImport={vi.fn()} />)
    expect(screen.getByText(/never uploaded/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /template/i }).getAttribute('href')).toBe('/samples/balances-template.csv')
  })

  it('imports balances and shows where each account went', async () => {
    const onImport = vi.fn()
    render(<BalancesImport onImport={onImport} />)
    choose('Account Name,Current Value\nIndividual,"$1,000.00"\nROTH IRA,"$2,000.00"\n')
    expect(await screen.findByText(/Imported 2 accounts/)).toBeTruthy()
    expect(onImport).toHaveBeenCalledWith({ brokerage: 1_000, ira: 2_000 })
    expect(screen.getByText(/ROTH IRA/).textContent).toContain('IRA / Roth IRA')
  })

  it('lists bad rows by line and still imports the good ones', async () => {
    const onImport = vi.fn()
    render(<BalancesImport onImport={onImport} />)
    choose('account_type,balance\nira,500\nsavings,10\n')
    expect(await screen.findByText('Line 3: Unknown account type "savings". Use workplace, ira, brokerage or other.')).toBeTruthy()
    expect(onImport).toHaveBeenCalledWith({ ira: 500 })
  })

  it('imports the same file again after it is picked a second time', async () => {
    const onImport = vi.fn()
    render(<BalancesImport onImport={onImport} />)
    const input = screen.getByLabelText(/import balances from a csv/i) as HTMLInputElement
    choose('account_type,balance\nira,500\n')
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1))
    expect(input.value).toBe('')
    choose('account_type,balance\nira,500\n')
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(2))
  })

  it('shows an error when the file cannot be read', async () => {
    render(<BalancesImport onImport={vi.fn()} />)
    const file = new File(['x'], 'broken.csv')
    file.text = () => Promise.reject(new Error('denied'))
    fireEvent.change(screen.getByLabelText(/import balances from a csv/i), { target: { files: [file] } })
    expect(await screen.findByText(/Couldn't read broken\.csv/)).toBeTruthy()
  })

  it('keeps the status region in the page before any import, so screen readers announce results', () => {
    render(<BalancesImport onImport={vi.fn()} />)
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('imports nothing from an unrecognized file', async () => {
    const onImport = vi.fn()
    render(<BalancesImport onImport={onImport} />)
    choose('date,amount\n2026-01-01,5\n')
    expect(await screen.findByText(/Unrecognized file/)).toBeTruthy()
    expect(onImport).not.toHaveBeenCalled()
  })
})
