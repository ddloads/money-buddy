import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../utils/api'
import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setAuth, logout: storeLogout, user, token } = useAuthStore()
  const googleAuthStatus = useQuery({
    queryKey: ['auth', 'google-status'],
    queryFn: () => authAPI.googleStatus().then((res) => res.data),
    staleTime: 1000 * 60 * 10,
    retry: false,
  })

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials) => authAPI.login(credentials),
    onSuccess: (res) => {
      const { user, access_token } = res.data
      setAuth(user, access_token)
      queryClient.clear()
      navigate('/dashboard')
    },
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (data) => authAPI.register(data),
    onSuccess: (res) => {
      const { user, access_token } = res.data
      setAuth(user, access_token)
      queryClient.clear()
      navigate('/dashboard')
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => authAPI.logout().catch(() => {}), // ignore server errors
    onSettled: () => {
      storeLogout()
      queryClient.clear()
      navigate('/login')
    },
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data) => authAPI.updateProfile(data),
    onSuccess: (res) => {
      useAuthStore.getState().updateUser(res.data)
    },
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data) => authAPI.changePassword(data),
  })

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: () => authAPI.deleteAccount(),
    onSuccess: () => {
      storeLogout()
      queryClient.clear()
      navigate('/login')
    },
  })

  return {
    user,
    token,
    isAuthenticated: !!token,
    googleAuthEnabled: !!googleAuthStatus.data?.enabled,
    googleAuthStatus,
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
    updateProfile: updateProfileMutation,
    changePassword: changePasswordMutation,
    deleteAccount: deleteAccountMutation,
  }
}
