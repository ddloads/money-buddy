import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      darkMode: true,

      // Set auth data after login/register
      setAuth: (user, token) => {
        localStorage.setItem('mb_token', token)
        localStorage.setItem('mb_user', JSON.stringify(user))
        set({ user, token })
      },

      // Update user profile (partial update)
      updateUser: (updates) => {
        const current = get().user
        const updated = { ...current, ...updates }
        localStorage.setItem('mb_user', JSON.stringify(updated))
        set({ user: updated })
      },

      // Clear auth on logout
      logout: () => {
        localStorage.removeItem('mb_token')
        localStorage.removeItem('mb_user')
        set({ user: null, token: null })
      },

      // Dark mode toggle
      toggleDarkMode: () => {
        const next = !get().darkMode
        set({ darkMode: next })
        if (next) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      setDarkMode: (value) => {
        set({ darkMode: value })
        if (value) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      // Apply theme on app init (called in App.jsx)
      initTheme: () => {
        const { darkMode } = get()
        if (darkMode) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },
    }),
    {
      name: 'mb_auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        darkMode: state.darkMode,
      }),
    }
  )
)
