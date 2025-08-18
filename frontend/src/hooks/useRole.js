// src/hooks/useRole.js
import { useEffect, useState, useCallback } from 'react'
import api from '../utils/api'

// Lê auth do localStorage (compatível com 'auth.token' e 'token' solto)
function readAuth() {
  const ls = JSON.parse(localStorage.getItem('auth') || '{}')
  return {
    token: ls.token || localStorage.getItem('token') || '',
    role: ls.role || 'usuario',
    userId: ls.userId || '',
  }
}

// Escreve a role confirmada no localStorage
function writeRole(role) {
  const ls = JSON.parse(localStorage.getItem('auth') || '{}')
  localStorage.setItem('auth', JSON.stringify({ ...ls, role }))
}

export default function useRole() {
  const [token, setToken] = useState('')
  const [role, setRole] = useState('usuario')
  const [userId, setUserId] = useState('')
  const [user, setUser] = useState(null)
  const [roleLoaded, setRoleLoaded] = useState(false) // quando true, já pode renderizar menus

  // Revalida no backend (aceita várias formas de resposta)
  const refreshRole = useCallback(async () => {
    if (!token) { setRoleLoaded(true); return null }
    try {
      const { data } = await api.get('/users/checkuser', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const u = data?.user || data?.currentUser || data // diferentes controladores
      const backendRole = String(u?.role || 'usuario')
      const backendId = String(u?._id || u?.id || '')
      if (backendRole !== role) {
        setRole(backendRole)
        writeRole(backendRole)
      }
      if (backendId && backendId !== userId) setUserId(backendId)
      setUser(u || null)
      return u
    } catch {
      // mantém estado local
      return null
    } finally {
      setRoleLoaded(true)
    }
  }, [token, role, userId])

  // Carrega do localStorage logo de cara (otimista para não “sumir” menu)
  useEffect(() => {
    const a = readAuth()
    setToken(a.token)
    setRole(a.role || 'usuario')
    setUserId(a.userId || '')
    setRoleLoaded(true)      // mostra já (otimista)
    // revalida com backend em seguida
    refreshRole()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Ouve mudanças em outras abas
  useEffect(() => {
    const syncFromStorage = () => {
      const a = readAuth()
      setToken(a.token)
      setRole(a.role || 'usuario')
      setUserId(a.userId || '')
      setRoleLoaded(true)
      refreshRole()
    }
    window.addEventListener('storage', syncFromStorage)
    return () => window.removeEventListener('storage', syncFromStorage)
  }, [refreshRole])

  return {
    role, roleLoaded, token, userId, user,
    isAdmin: role === 'admin',
    isConcessionario: role === 'concessionario',
    isUsuario: role === 'usuario',
    refreshRole,
  }
}
