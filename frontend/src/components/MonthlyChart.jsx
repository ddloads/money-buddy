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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600 dark:text-gray-400 capitalize">{entry.name}:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            ${entry.value?.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function MonthlyChart({ data, loading }) {
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
          <p className="text-sm text-gray-500 dark:text-gray-400">No data yet</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(156,163,175,0.2)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: 'currentColor' }}
          axisLine={false}
          tickLine={false}
          className="text-gray-500 dark:text-gray-400"
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'currentColor' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
          className="text-gray-500 dark:text-gray-400"
          width={55}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(16,185,129,0.05)' }} />
        <Legend
          formatter={(value) => (
            <span className="text-xs font-medium capitalize text-gray-600 dark:text-gray-400">
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
