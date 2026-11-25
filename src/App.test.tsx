// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { EXAMPLE_PLAN, savePlan } from './state/plan'

beforeEach(() => {
  localStorage.clear()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
  // jsdom has no ResizeObserver; the results chart (Recharts) needs one.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  history.replaceState(null, '', '/')
})

const methodologyHeading = () => screen.queryByRole('heading', { level: 1, name: 'How 10,000 Futures works' })

describe('App routing', () => {
  it('opens on the planner with a link to the methodology', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'How it works' }).getAttribute('href')).toBe('#/methodology')
  })

  it('shows the methodology page at #/methodology', () => {
    history.replaceState(null, '', '/#/methodology')
    render(<App />)
    expect(methodologyHeading()).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'How it works' })).toBeNull()
  })

  it('switches pages when the hash changes', async () => {
    render(<App />)
    window.location.hash = '#/methodology'
    await waitFor(() => expect(methodologyHeading()).toBeTruthy())
    window.location.hash = '#/'
    await waitFor(() => expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy())
  })

  it('stops listening for hash changes when unmounted', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<App />)
    const handler = add.mock.calls.find(([type]) => type === 'hashchange')![1]
    unmount()
    expect(remove).toHaveBeenCalledWith('hashchange', handler)
  })

  it('links from a finished plan to the full methodology', () => {
    savePlan(EXAMPLE_PLAN)
    render(<App />)
    expect(screen.getByRole('link', { name: /read the full methodology/i }).getAttribute('href')).toBe('#/methodology')
  })
})
