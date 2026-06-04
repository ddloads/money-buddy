import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useCurrency } from '../hooks/useCurrency'

const FALLBACK_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
]

const CustomTooltip = ({ active, payload, format }) => {
  if (!active || !payload?.length) return null
  const { name, value, payload: d } = payload[0]
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
        {d.icon ? `${d.icon} ` : ''}{name}
      </p>
      <p className="text-gray-600 dark:text-gray-400">
        Total: <span className="font-medium text-gray-900 dark:text-gray-100">{format(value)}</span>
      </p>
      <p className="text-gray-500 dark:text-gray-400 text-xs">{d.count} bill{d.count !== 1 ? 's' : ''}</p>
    </div>
  )
}

export default function CategoryChart({ data, loading }) {
  const { format } = useCurrency()
  if (loading) {
    return (
      <div className="h-56 flex items-center justify-center">
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="skeleton h-4 w-20 rounded" />
              <div className="skeleton h-3 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2">🏷️</div>
          <p className="text-sm text-gray-500 dark:text-gray-400">No categorised bills this month</p>
        </div>
      </div>
    )
  }

  const chartData = data.map((d) => ({
    name: d.name,
    value: d.total,
    color: d.color || FALLBACK_COLORS[0],
    icon: d.icon,
    count: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip format={format} />} />
        <Legend
          formatter={(value) => (
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
