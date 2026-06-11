const colorClasses = {
  emerald: {
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
    valueColor: 'text-emerald-300',
  },
  blue: {
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    valueColor: 'text-blue-300',
  },
  red: {
    iconBg: 'bg-rose-500/15',
    iconColor: 'text-rose-400',
    valueColor: 'text-rose-300',
  },
  yellow: {
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    valueColor: 'text-amber-300',
  },
  purple: {
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-400',
    valueColor: 'text-violet-300',
  },
}

export default function StatCard({ title, value, subtitle, Icon, color = 'emerald', loading }) {
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
          <div className="skeleton h-10 w-10 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="card-interactive p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${c.valueColor} truncate`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
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
