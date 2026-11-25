// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

beforeEach(() => {
  localStorage.clear()
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo
})
afterEach(() => {
  cleanup()
  window.location.hash = ''
})

const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })

describe('App routing', () => {
  it('opens on the planner with a link to the methodology', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'How it works' }).getAttribute('href')).toBe('#/methodology')
  })

  it('shows the methodology page at #/methodology', () => {
    window.location.hash = '#/methodology'
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'How 10,000 Futures works' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'How it works' })).toBeNull()
  })

  it('switches pages when the hash changes', () => {
    render(<App />)
    goTo('#/methodology')
    expect(screen.getByRole('heading', { level: 1, name: 'How 10,000 Futures works' })).toBeTruthy()
    goTo('#/')
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy()
  })
})
