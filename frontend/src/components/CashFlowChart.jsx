import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useCurrency } from '../hooks/useCurrency'

const CustomTooltip = ({ active, payload, label, format }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-midnight-800 border border-white/10 rounded-xl shadow-card-hover p-3 min-w-[160px] text-sm">
      <p className="font-semibold text-slate-200 mb-2">{label}</p>
      <p className="text-slate-400">Income: <span className="text-blue-300 font-medium">{format(d.income)}</span></p>
      <p className="text-slate-400">Expenses: <span className="text-amber-300 font-medium">{format(d.expenses)}</span></p>
      <div className={`mt-2 pt-2 border-t border-white/10 font-semibold ${d.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        Net: {d.net >= 0 ? '+' : ''}{format(d.net)}
      </div>
    </div>
  )
}

export default function CashFlowChart({ data, loading }) {
  const { format } = useCurrency()

  if (loading) {
    return <div className="h-64 skeleton rounded-xl" />
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2">💸</div>
          <p className="text-sm text-slate-400">No transactions in this period yet</p>
        </div>
      </div>
    )
  }

  const chartData = data.map((d) => ({ ...d, month: d.month_name }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'currentColor' }} axisLine={false} tickLine={false} className="text-slate-500" />
        <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} axisLine={false} tickLine={false} tickFormatter={(v) => format(v)} className="text-slate-500" width={55} />
        <Tooltip content={<CustomTooltip format={format} />} cursor={{ fill: 'rgba(16,185,129,0.05)' }} />
        <Legend formatter={(value) => <span className="text-xs font-medium capitalize text-slate-400">{value}</span>} />
        <Bar dataKey="income" name="Income" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Line type="monotone" dataKey="net" name="Net" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
