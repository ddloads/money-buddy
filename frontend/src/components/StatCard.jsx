export default function StatCard({ title, value, subtitle, Icon, color = 'emerald', loading }) {
  const colorClasses = {
    emerald: {
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-700 dark:text-emerald-300',
    },
    blue: {
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      iconColor: 'text-blue-600 dark:text-blue-400',
      valueColor: 'text-blue-700 dark:text-blue-300',
    },
    red: {
      iconBg: 'bg-red-100 dark:bg-red-900/50',
      iconColor: 'text-red-600 dark:text-red-400',
      valueColor: 'text-red-700 dark:text-red-300',
    },
    yellow: {
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/50',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      valueColor: 'text-yellow-700 dark:text-yellow-300',
    },
    purple: {
      iconBg: 'bg-purple-100 dark:bg-purple-900/50',
      iconColor: 'text-purple-600 dark:text-purple-400',
      valueColor: 'text-purple-700 dark:text-purple-300',
    },
  }

  const c = colorClasses[color] || colorClasses.emerald

  if (loading) {
    return (
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="skeleton h-3 w-24 mb-3" />
            <div className="skeleton h-7 w-16 mb-2" />
            <div className="skeleton h-3 w-20" />
          </div>
          <div className="skeleton h-10 w-10 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5 hover:shadow-card-hover transition-shadow duration-200 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className={`text-2xl font-bold ${c.valueColor} truncate`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${c.iconBg} flex-shrink-0`}>
            <Icon className={`h-6 w-6 ${c.iconColor}`} />
          </div>
        )}
      </div>
    </div>
  )
}
