import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useCurrency } from '../hooks/useCurrency'

const CustomTooltip = ({ active, payload, label, format }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-midnight-800 border border-white/10 rounded-xl shadow-card-hover p-3">
      <p className="text-sm font-semibold text-slate-200 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-400 capitalize">{entry.name}:</span>
          <span className="font-medium text-white">
            {format(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MonthlyChart({ data, loading }) {
  const { format } = useCurrency()
  if (loading) {
    return (
      <div className="h-64 flex items-end gap-2 px-4 pb-6">
        {[70, 45, 85, 60, 90, 55].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end gap-1">
            <div className="skeleton rounded-t-sm" style={{ height: `${h}%` }} />
            <div className="skeleton h-3 w-full rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-sm text-slate-400">No data yet</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(148,163,184,0.12)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: 'currentColor' }}
          axisLine={false}
          tickLine={false}
          className="text-slate-500"
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'currentColor' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => format(v)}
          className="text-slate-500"
          width={55}
        />
        <Tooltip content={<CustomTooltip format={format} />} cursor={{ fill: 'rgba(16,185,129,0.05)' }} />
        <Legend
          formatter={(value) => (
            <span className="text-xs font-medium capitalize text-slate-400">
              {value}
            </span>
          )}
        />
        <Bar
          dataKey="total"
          name="Total"
          fill="#10b981"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
        <Bar
          dataKey="paid"
          name="Paid"
          fill="#34d399"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
        <Bar
          dataKey="unpaid"
          name="Unpaid"
          fill="#fbbf24"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
