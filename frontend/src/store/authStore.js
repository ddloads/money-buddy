import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,

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

      // The app is dark-only — make sure the class is always present
      // (called in App.jsx on mount)
      initTheme: () => {
        document.documentElement.classList.add('dark')
      },
    }),
    {
      name: 'mb_auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
)
