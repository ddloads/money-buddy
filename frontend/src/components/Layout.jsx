import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  HomeIcon,
  DocumentTextIcon,
  TagIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  BanknotesIcon,
  WalletIcon,
  ChartPieIcon,
  FlagIcon,
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../store/authStore'
import { useAuth } from '../hooks/useAuth'
import PlaceholderTag from './PlaceholderTag'

const mainLinks = [
  { to: '/dashboard', label: 'Dashboard', Icon: HomeIcon },
  { to: '/bills', label: 'Bills', Icon: DocumentTextIcon },
  { to: '/income', label: 'Income', Icon: BanknotesIcon },
  { to: '/categories', label: 'Categories', Icon: TagIcon },
  { to: '/settings', label: 'Settings', Icon: Cog6ToothIcon },
]

// Aspirational features — visible in the nav but not built yet
const placeholderLinks = [
  { label: 'Budget', Icon: WalletIcon },
  { label: 'Reports', Icon: ChartPieIcon },
  { label: 'Goals', Icon: FlagIcon },
]

function NavItem({ to, label, Icon, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => (isActive ? 'nav-item-active' : 'nav-item')}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span>{label}</span>
    </NavLink>
  )
}

function PlaceholderNavItem({ label, Icon }) {
  return (
    <button
      type="button"
      className="nav-item w-full cursor-default opacity-60 hover:bg-transparent hover:text-slate-400"
      title="Placeholder — not functional yet"
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      <PlaceholderTag />
    </button>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="px-3 pt-4 pb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
      {children}
    </p>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuthStore()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const initials = user
    ? `${(user.first_name || user.name || 'U')[0]}`.toUpperCase()
    : 'U'

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.name || 'User'

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex h-screen bg-midnight-950 overflow-hidden">
      {/* ── Sidebar overlay (mobile) ─────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-72 flex flex-col
          bg-midnight-900 border-r border-white/[0.06]
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-emerald-500/30 blur-lg" />
              <img src="/logo.svg" alt="Money Buddy" className="relative h-10 w-10" />
            </div>
            <div>
              <h1 className="font-bold text-white leading-tight">Money Buddy</h1>
              <p className="text-[11px] font-medium text-emerald-400/90 tracking-wide">
                SMART BILL MANAGER
              </p>
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06]"
            onClick={closeSidebar}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Quick add */}
        <div className="px-4 pb-2">
          <button
            onClick={() => { navigate('/bills/new'); closeSidebar() }}
            className="btn-primary w-full py-2.5"
          >
            <PlusIcon className="h-4 w-4" />
            Add New Bill
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 sidebar-scroll px-4 pb-4">
          <SectionLabel>Menu</SectionLabel>
          <div className="space-y-1">
            {mainLinks.map(({ to, label, Icon }) => (
              <NavItem key={to} to={to} label={label} Icon={Icon} onClick={closeSidebar} />
            ))}
          </div>

          <SectionLabel>Coming Soon</SectionLabel>
          <div className="space-y-1">
            {placeholderLinks.map(({ label, Icon }) => (
              <PlaceholderNavItem key={label} label={label} Icon={Icon} />
            ))}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-white/[0.06] space-y-2">
          {/* User card */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-100 truncate">{displayName}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="nav-item w-full text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
            <span>{logout.isPending ? 'Signing out…' : 'Sign Out'}</span>
          </button>

          {/* Build version */}
          {import.meta.env.VITE_GIT_COMMIT && import.meta.env.VITE_GIT_COMMIT !== 'unknown' && (
            <p className="px-1 text-[10px] text-slate-600 font-mono">
              {import.meta.env.VITE_GIT_COMMIT.slice(0, 7)}
            </p>
          )}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-midnight-900/90 backdrop-blur border-b border-white/[0.06] flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="" className="h-7 w-7" />
            <span className="font-bold text-white">Money Buddy</span>
          </div>
          <button
            onClick={() => navigate('/bills/new')}
            className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10"
            title="Add new bill"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
            <Outlet />
          </div>
        </main>

        {/* Bottom nav (mobile) — fixed so browser chrome changes can't push it off-screen */}
        <nav
          className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-midnight-900/95 backdrop-blur-md border-t border-white/[0.06]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex">
            {mainLinks.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-200 ${
                    isActive
                      ? 'text-emerald-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
