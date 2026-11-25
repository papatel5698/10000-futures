import { useEffect, useState } from 'react'
import { Onboarding } from './components/Onboarding'
import { Results } from './components/Results'
import { DEFAULT_FIRM_ID, type FirmConfig } from './config/firm'
import { clearPlan, emptyPlan, examplePlan, isComplete, loadPlan, savePlan, type Plan } from './state/plan'

type View = { name: 'onboarding'; startAt: number } | { name: 'results' }

export default function App({ firm }: { firm: FirmConfig }) {
  const [blank] = useState<Plan>(() => emptyPlan(firm.assumptions))
  const [plan, setPlan] = useState<Plan>(() => loadPlan(firm.id, firm.assumptions) ?? blank)
  const [view, setView] = useState<View>(() =>
    isComplete(plan) ? { name: 'results' } : { name: 'onboarding', startAt: 0 },
  )

  useEffect(() => {
    if (plan !== blank) savePlan(firm.id, plan, firm.assumptions)
  }, [plan, blank, firm.id, firm.assumptions])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view])

  return (
    <div className="app">
      <nav className="topbar">
        <span className="brand">
          {firm.logo ? <img className="logo" src={firm.logo} alt="" /> : <span className="mark" aria-hidden="true" />}
          {firm.name}
        </span>
        {firm.id !== DEFAULT_FIRM_ID && <span className="powered">Powered by 10,000 Futures</span>}
      </nav>
      {view.name === 'results' && isComplete(plan) ? (
        <Results
          plan={plan}
          setPlan={setPlan}
          onEdit={() => setView({ name: 'onboarding', startAt: 1 })}
          onReset={() => {
            clearPlan(firm.id)
            setPlan(blank)
            setView({ name: 'onboarding', startAt: 0 })
          }}
        />
      ) : (
        <Onboarding
          key={view.name === 'onboarding' ? view.startAt : 0}
          plan={plan}
          setPlan={setPlan}
          example={examplePlan(firm.assumptions)}
          startAt={view.name === 'onboarding' ? view.startAt : 0}
          onFinish={() => setView({ name: 'results' })}
        />
      )}
    </div>
  )
}
