// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_PLAN } from '../state/plan'
import { Onboarding } from './Onboarding'

afterEach(cleanup)
Blob.prototype.text ??= function (this: Blob) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsText(this)
  })
}

const BALANCES_STEP = 3

describe('Onboarding balances step', () => {
  it('fills imported balance types and keeps balances typed by hand', async () => {
    const setPlan = vi.fn()
    const plan = { ...EMPTY_PLAN, age: 30, retireAge: 60, balances: { ...EMPTY_PLAN.balances, workplace: 50_000 } }
    render(<Onboarding plan={plan} setPlan={setPlan} onFinish={vi.fn()} startAt={BALANCES_STEP} />)
    expect(screen.getByRole('heading', { name: 'What do you have invested today?' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/import balances from a csv/i), {
      target: { files: [new File(['Account Name,Current Value\nIndividual,"$7,000"\n'], 'p.csv')] },
    })
    await waitFor(() => expect(setPlan).toHaveBeenCalled())
    expect(setPlan.mock.calls[0][0].balances).toEqual({ workplace: 50_000, ira: null, brokerage: 7_000, other: null })
  })
})
