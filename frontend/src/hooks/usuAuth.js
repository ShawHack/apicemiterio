// src/hooks/useAuth.js
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import useFlashMessage from './useFlashMessage'

function normalizeToken(t) {
  if (!t) return ''
  const s = typeof t === 'string' ? t : String(t)
  return s.replace(/^"+|"+$/g, '') // remove aspas excedentes
}
function readAuthLS() {
  const ls = JSON.parse(localStorage.getItem('auth') || '{}')
  const token = ls.token || localStorage.getItem('token') || ''
  return { token: normalizeToken(token), role: ls.role, userId: ls.userId, name: ls.name, email: ls.email }
}
function writeAuthLS(obj) {
  const prev = JSON.parse(localStorage.getItem('auth') || '{}')
  localStorage.setItem('auth', JSON.stringify({ ...prev, ...obj }))
  if (obj.token) localStorage.setItem('token', normalizeToken(obj.token))
}
function clearAuthLS() {
  localStorage.removeItem('auth')
  localStorage.removeItem('token')
}
function setAxiosAuth(token) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete api.defaults.headers.common['Authorization']
}

export default function useAuth() {
  const [authenticated, setAuthenticated] = useState(false)
  const [user, setUser] = useState(null)       // objeto do /users/checkuser
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { setFlashMessage } = useFlashMessage()

  // Carrega sessão ao iniciar a app
  useEffect(() => {
    (async () => {
      const { token } = readAuthLS()
      if (!token) {
        setAxiosAuth('')
        setAuthenticated(false)
        setUser(null)
        setLoading(false)
        return
      }
      try {
        setAxiosAuth(token)
        const { data } = await api.get('/users/checkuser', { headers: { Authorization: `Bearer ${token}` } })
        const u = data?.user || data?.currentUser || data
        const role = String(u?.role || 'usuario')
        const userId = String(u?._id || u?.id || '')
        writeAuthLS({ token, role, userId, name: u?.name, email: u?.email })
        setUser(u)
        setAuthenticated(true)
      } catch {
        // token inválido/expirado → limpa sessão
        setAxiosAuth('')
        clearAuthLS()
        setAuthenticated(false)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const login = useCallback(async ({ email, password }) => {
    try {
      // 1) login → token
      const { data: loginData } = await api.post('/users/login', { email, password })
      const token = normalizeToken(loginData?.token)
      if (!token) throw new Error('Token ausente no login')

      setAxiosAuth(token)
      writeAuthLS({ token })

      // 2) confirma usuário/papel
      const { data: meData } = await api.get('/users/checkuser', { headers: { Authorization: `Bearer ${token}` } })
      const u = meData?.user || meData?.currentUser || meData
      const role = String(u?.role || 'usuario')
      const userId = String(u?._id || u?.id || '')
      writeAuthLS({ role, userId, name: u?.name, email: u?.email })

      // 3) atualiza estado global de auth
      setUser(u)
      setAuthenticated(true)
      setFlashMessage('Login realizado com sucesso!', 'success')
      navigate('/')
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao fazer login'
      setFlashMessage(msg, 'error')
      setAuthenticated(false)
      setUser(null)
      setAxiosAuth('')
      clearAuthLS()
    }
  }, [navigate, setFlashMessage])

  const register = useCallback(async (payload) => {
    try {
      await api.post('/users/register', payload)
      setFlashMessage('Cadastro realizado! Faça login.', 'success')
      navigate('/login')
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao cadastrar'
      setFlashMessage(msg, 'error')
    }
  }, [navigate, setFlashMessage])

  const logout = useCallback(() => {
    setAxiosAuth('')
    clearAuthLS()
    setAuthenticated(false)
    setUser(null)
    navigate('/login')
  }, [navigate])

  return { authenticated, user, loading, register, logout, login }
}
