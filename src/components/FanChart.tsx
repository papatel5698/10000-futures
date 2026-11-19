import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PercentilePaths } from '../sim/montecarlo'
import { compact } from '../format'

interface Props {
  paths: PercentilePaths
  startAge: number
  retireAge: number
  target: number
}

export function FanChart({ paths, startAge, retireAge, target }: Props) {
  const data = paths[50].map((_, t) => ({
    age: startAge + t,
    range: [paths[10][t], paths[90][t]] as [number, number],
    p10: paths[10][t],
    p25: paths[25][t],
    p50: paths[50][t],
  }))
  const raw = Math.max(target * 1.25, paths[75][paths[75].length - 1])
  const step = 10 ** Math.floor(Math.log10(raw)) / 2
  const yMax = Math.ceil(raw / step) * step
  return (
    <div className="chart" role="img" aria-label="Projected portfolio by age at the 10th, 25th and 50th percentiles">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="age" tick={{ fill: 'var(--muted)', fontSize: 12 }} stroke="var(--line)" interval="preserveStartEnd" minTickGap={24} />
          <YAxis
            tickFormatter={compact}
            tick={{ fill: 'var(--muted)', fontSize: 12 }}
            stroke="var(--line)"
            width={64}
            domain={[0, yMax]}
            allowDataOverflow
          />
          <Tooltip
            contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)' }}
            labelFormatter={(a) => `Age ${a}`}
            formatter={(v, name) => (name === 'range' ? null : [compact(v as number), String(name)])}
          />
          <Area dataKey="range" stroke="none" fill="var(--band)" isAnimationActive={false} />
          <Line dataKey="p50" name="Average (50th)" stroke="var(--p50)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          <Line dataKey="p25" name="Below average (25th)" stroke="var(--p25)" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="p10" name="Very below average (10th)" stroke="var(--p10)" strokeWidth={2} dot={false} isAnimationActive={false} />
          <ReferenceLine
            y={target}
            stroke="var(--muted)"
            strokeDasharray="6 5"
            label={{ value: `FI target ${compact(target)}`, position: 'insideTopLeft', fill: 'var(--muted)', fontSize: 12 }}
          />
          <ReferenceLine
            x={retireAge}
            stroke="var(--muted)"
            strokeDasharray="3 3"
            label={{ value: `retire ${retireAge}`, position: 'insideTopRight', fill: 'var(--muted)', fontSize: 12 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
