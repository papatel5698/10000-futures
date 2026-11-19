import { useEffect, useState } from 'react'
import { Onboarding } from './components/Onboarding'
import { Results } from './components/Results'
import { EMPTY_PLAN, clearPlan, isComplete, loadPlan, savePlan, type Plan } from './state/plan'

type View = { name: 'onboarding'; startAt: number } | { name: 'results' }

export default function App() {
  const [plan, setPlan] = useState<Plan>(() => loadPlan() ?? EMPTY_PLAN)
  const [view, setView] = useState<View>(() =>
    isComplete(plan) ? { name: 'results' } : { name: 'onboarding', startAt: 0 },
  )

  useEffect(() => {
    if (plan !== EMPTY_PLAN) savePlan(plan)
  }, [plan])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view])

  return (
    <div className="app">
      <nav className="topbar">
        <span className="brand">
          <span className="mark" aria-hidden="true" />
          10,000 Futures
        </span>
      </nav>
      {view.name === 'results' && isComplete(plan) ? (
        <Results
          plan={plan}
          setPlan={setPlan}
          onEdit={() => setView({ name: 'onboarding', startAt: 1 })}
          onReset={() => {
            clearPlan()
            setPlan(EMPTY_PLAN)
            setView({ name: 'onboarding', startAt: 0 })
          }}
        />
      ) : (
        <Onboarding
          key={view.name === 'onboarding' ? view.startAt : 0}
          plan={plan}
          setPlan={setPlan}
          startAt={view.name === 'onboarding' ? view.startAt : 0}
          onFinish={() => setView({ name: 'results' })}
        />
      )}
    </div>
  )
}
