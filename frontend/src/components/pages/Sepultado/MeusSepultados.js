import api from '../../../utils/api.js'
import { useState, useEffect, useCallback } from "react"
import { Link, useNavigate } from 'react-router-dom'
import styles from './Dashboard.module.css'
import RoundedImage from '../../layout/RoundedImage'
import useFlashMessage from "../../../hooks/useFlashMessage.js"
import useRole from "../../../hooks/useRole.js"

const LIMIT = 20

function MeusSepultados() {
  const [seps, setSeps] = useState([])
  const [q, setQ] = useState('')
  const { setFlashMessage } = useFlashMessage()
  const navigate = useNavigate()

  const { roleLoaded, token, userId, isAdmin, isConcessionario } = useRole()

  const fetchList = useCallback(async (qArg = '') => {
    const qClean = (qArg || '').trim()
    const base = isAdmin ? '/sepultados/meussepultados' : '/sepultados/meussepultados'
    const url = `${base}?q=${encodeURIComponent(qClean)}&limit=${LIMIT}`

    try {
      const res = await api.get(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = res.data
      if (Array.isArray(data)) setSeps(data)
      else if (Array.isArray(data?.sepults)) setSeps(data.sepults)
      else if (Array.isArray(data?.sepultados)) setSeps(data.sepultados)
      else setSeps([])
    } catch (err) {
      const status = err?.response?.status
      const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar sepultados.'
      if (status === 401) setFlashMessage("Sessão expirada ou não autenticado.", "error")
      else if (status === 403) setFlashMessage("Sem permissão para acessar esta lista.", "error")
      else setFlashMessage(msg, "error")
    }
  }, [isAdmin, token, setFlashMessage])

  useEffect(() => {
    if (!roleLoaded) return
    if (!(isAdmin || isConcessionario)) {
      setFlashMessage('Acesso restrito.', 'error')
      navigate('/')
      return
    }
    if (token) fetchList('')
  }, [roleLoaded, isAdmin, isConcessionario, token, fetchList, navigate, setFlashMessage])

  function canEdit(sep) {
    if (isAdmin) return true
    if (isConcessionario) {
      const ids = (sep.concessionarios || []).map(String)
      return userId ? ids.includes(String(userId)) : false
    }
    return false
  }

  const canDelete = isAdmin
  const canAdd = isAdmin

  async function removeSepultado(id) {
    try {
      const res = await api.delete(`/sepultados/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setSeps(prev => prev.filter(s => s._id !== id))
      setFlashMessage(res.data?.message || 'Removido com sucesso!', 'success')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao remover'
      setFlashMessage(msg, 'error')
    }
  }

  function onSubmitFilter(e) {
    e.preventDefault()
    fetchList(q)
  }

  if (!roleLoaded) {
    return (
      <section>
        <h2>Gerenciamento de Sepultados</h2>
        <div className={styles.empty_state}>Carregando…</div>
      </section>
    )
  }

  return (
    <section>
      <h2>Gerenciamento de Sepultados</h2>

      <div className={styles.seplist_header}>
        {canAdd ? (
          <Link to="/sepultados/add">Novo Registro</Link>
        ) : (
          <span className={styles.helptext}>
            Você pode editar apenas os registros atribuídos a você. Para criar novos, fale com um administrador.
          </span>
        )}
      </div>

      <form onSubmit={onSubmitFilter} className={styles.filter_bar}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, rua, quadra ou chapa"
          className={styles.filter_input}
        />
        <button type="submit" className={styles.filter_button}>Pesquisar</button>
        {q && (
          <button type="button" className={styles.filter_button} onClick={() => { setQ(''); fetchList(''); }}>
            Limpar
          </button>
        )}
      </form>

      <div className={styles.seplist_container}>
        {seps.map((sepultado) => {
          const editar = canEdit(sepultado)

          // Montagem robusta da URL de imagem
          const API = (process.env.REACT_APP_API || '').replace(/\/+$/, '') // remove barra final
          const DEFAULT_IMG = API
            ? `${API}/images/sepultados/sepultura-padrao.png`
            : `/images/sepultados/sepultura-padrao.png`

          const raw = sepultado?.images?.[0]
          const cleaned = typeof raw === 'string' ? raw.trim() : ''
          const isBad = !cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === '/'

          const srcImg = !isBad
            ? (cleaned.startsWith('http') ? cleaned : `${API}/images/sepultados/${cleaned}`)
            : DEFAULT_IMG

          return (
            <div className={styles.seplist_row} key={sepultado._id}>
              <RoundedImage
                src={srcImg}
                alt={sepultado.nome}
                width="px75"
              />
              <span className="bold">{sepultado.nome}</span>

              <div className={styles.actions}>
                {editar && <Link to={`/sepultados/edit/${sepultado._id}`}>Editar</Link>}
                {canDelete && <button onClick={() => removeSepultado(sepultado._id)}>Excluir</button>}
              </div>
            </div>
          )
        })}

        {seps.length === 0 && (
          <div className={styles.empty_state}>Nenhum resultado para sua busca.</div>
        )}
      </div>
    </section>
  )
}

export default MeusSepultados
