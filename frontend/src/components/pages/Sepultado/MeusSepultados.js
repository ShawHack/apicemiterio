import api from '../../../utils/api.js'
import { useState, useEffect, useCallback, useRef } from "react"
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

  // cache local de concessionários para resolver nome/email -> _id
  const consCacheRef = useRef(null)

  const fetchConcessionarios = useCallback(async () => {
    if (consCacheRef.current) return consCacheRef.current
    try {
      const { data } = await api.get('/users/concessionarios', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const arr = Array.isArray(data) ? data : []
      consCacheRef.current = arr
      return arr
    } catch (e) {
      consCacheRef.current = []
      return []
    }
  }, [token])

  const resolveUserId = useCallback(async (input) => {
    const term = String(input || '').trim()
    if (!term) return { id: null, reason: 'Entrada vazia.' }

    // se já parecer um ObjectId (24 hex) deixamos como está
    if (/^[a-f0-9]{24}$/i.test(term)) return { id: term }

    const list = await fetchConcessionarios()
    if (!list.length) return { id: null, reason: 'Não foi possível listar concessionários.' }

    const norm = (s) => String(s || '').trim().toLowerCase()

    // busca por e-mail
    if (term.includes('@')) {
      const email = norm(term)
      const match = list.find(u => norm(u.email) === email)
      if (match) return { id: match._id }
      return { id: null, reason: `Nenhum concessionário com o e-mail "${term}".` }
    }

    // busca por nome: exato -> startsWith -> includes
    const name = norm(term)
    const exact = list.filter(u => norm(u.name) === name)
    if (exact.length === 1) return { id: exact[0]._id }
    if (exact.length > 1) {
      return {
        id: null,
        reason: `Mais de um usuário com o nome exato "${term}":\n- ` + exact.map(u => `${u.name} <${u.email || 'sem e-mail'}>`).join('\n- ')
      }
    }

    const starts = list.filter(u => norm(u.name).startsWith(name))
    if (starts.length === 1) return { id: starts[0]._id }
    if (starts.length > 1) {
      return {
        id: null,
        reason: `Vários nomes iniciando com "${term}":\n- ` + starts.map(u => `${u.name} <${u.email || 'sem e-mail'}>`).join('\n- ')
      }
    }

    const contains = list.filter(u => norm(u.name).includes(name))
    if (contains.length === 1) return { id: contains[0]._id }
    if (contains.length > 1) {
      return {
        id: null,
        reason: `Vários nomes contendo "${term}":\n- ` + contains.map(u => `${u.name} <${u.email || 'sem e-mail'}>`).join('\n- ')
      }
    }

    return { id: null, reason: `Nenhum usuário encontrado para "${term}".` }
  }, [fetchConcessionarios])

  const fetchList = useCallback(async (qArg = '') => {
    const qClean = (qArg || '').trim()
    const base = '/sepultados/meussepultados'
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
  }, [token, setFlashMessage, isAdmin])

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

  // ---------- ATUALIZADO: ATRIBUIR / DESATRIBUIR por nome OU e-mail ----------
  async function atribuirConcessionario(sepId) {
    const entrada = prompt('Digite o NOME completo ou E-MAIL do concessionário a atribuir:')
    if (!entrada) return
    const { id, reason } = await resolveUserId(entrada)
    if (!id) {
      alert(reason)
      return
    }
    try {
      const res = await api.patch(
        `/sepultados/${sepId}/atribuir/${encodeURIComponent(id)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setFlashMessage(res.data?.message || 'Concessionário atribuído com sucesso!', 'success')
      fetchList(q)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao atribuir concessionário.'
      setFlashMessage(msg, 'error')
    }
  }

  async function desatribuirConcessionario(sepId) {
    const entrada = prompt('Digite o NOME completo ou E-MAIL do concessionário a remover:')
    if (!entrada) return
    const { id, reason } = await resolveUserId(entrada)
    if (!id) {
      alert(reason)
      return
    }
    try {
      const res = await api.patch(
        `/sepultados/${sepId}/desatribuir/${encodeURIComponent(id)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setFlashMessage(res.data?.message || 'Concessionário removido com sucesso!', 'success')
      fetchList(q)
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao remover atribuição.'
      setFlashMessage(msg, 'error')
    }
  }
  // --------------------------------------------------------------------------

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

          const API = (process.env.REACT_APP_API || '').replace(/\/+$/, '')
          const raw = sepultado?.images?.[0]
          const cleaned = (typeof raw === 'string' ? raw : '').trim()
          const isBad = !cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === '/'
          const srcImg = !isBad
            ? (cleaned.startsWith('http') ? cleaned : `${API}/images/sepultados/${cleaned}`)
            : '/sepultura-padrao.png'

          return (
            <div className={styles.seplist_row} key={sepultado._id}>
              <RoundedImage src={srcImg} alt={sepultado.nome} width="px75" />
              <span className="bold">{sepultado.nome}</span>

              <div className={styles.actions}>
                {editar && <Link to={`/sepultados/edit/${sepultado._id}`}>Editar</Link>}
                {canDelete && (
                  <button onClick={() => removeSepultado(sepultado._id)}>
                    Excluir
                  </button>
                )}

                {/* botões de atribuição só para admin */}
                {isAdmin && (
                  <>
                    <button onClick={() => atribuirConcessionario(sepultado._id)}>
                      Atribuir
                    </button>
                    <button onClick={() => desatribuirConcessionario(sepultado._id)}>
                      Desatribuir
                    </button>
                  </>
                )}
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
