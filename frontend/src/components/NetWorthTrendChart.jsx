import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useCurrency } from '../hooks/useCurrency'

const CustomTooltip = ({ active, payload, label, format }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-midnight-800 border border-white/10 rounded-xl shadow-card-hover p-3 min-w-[160px] text-sm">
      <p className="font-semibold text-slate-200 mb-2">{label}</p>
      <div className={`font-semibold ${d.net_worth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        Net worth: {format(d.net_worth)}
      </div>
      <p className="text-slate-400 mt-1">Assets: <span className="text-white">{format(d.assets)}</span></p>
      <p className="text-slate-400">Liabilities: <span className="text-white">{format(d.liabilities)}</span></p>
    </div>
  )
}

export default function NetWorthTrendChart({ data, loading }) {
  const { format } = useCurrency()

  if (loading) {
    return <div className="h-64 skeleton rounded-xl" />
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2">📈</div>
          <p className="text-sm text-slate-400">Add accounts and transactions to see your trend</p>
        </div>
      </div>
    )
  }

  const chartData = data.map((d) => ({ ...d, month: d.month_name }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'currentColor' }} axisLine={false} tickLine={false} className="text-slate-500" />
        <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} axisLine={false} tickLine={false} tickFormatter={(v) => format(v)} className="text-slate-500" width={55} />
        <Tooltip content={<CustomTooltip format={format} />} />
        <Area type="monotone" dataKey="net_worth" name="Net worth" stroke="#10b981" strokeWidth={2} fill="url(#nwFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
