// src/components/pages/SepultadoDetails.js
import styles from './SepultadoDetails.module.css'
import api from '../../../utils/api'

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import useFlashMessage from '../../../hooks/useFlashMessage'
import useRole from '../../../hooks/useRole'

function SepultadoDetails() {
  const [sep, setSep] = useState({})
  const [comentarios, setComentarios] = useState([])
  const [novoComentario, setNovoComentario] = useState('')
  const [carregandoComentarios, setCarregandoComentarios] = useState(false)
  const [expandedImage, setExpandedImage] = useState(null)

  // Detalhes dos concessionários carregados pelo front
  const [concessionariosInfo, setConcessionariosInfo] = useState([])

  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const { id } = useParams()
  const { setFlashMessage } = useFlashMessage()

  // auth/role
  const { roleLoaded, userId, isAdmin, token: roleToken } = useRole()
  const token = roleToken || localStorage.getItem('token') || ''

  // mostra exatamente a string recebida (sem parse/format)
  const mostrarData = (valor) => {
    if (valor == null) return 'Desconhecida'
    const s = String(valor).trim()
    return s.length ? s : 'Desconhecida'
  }

  useEffect(() => {
    // dados do sepultado
    api.get(`/sepultados/${id}`)
      .then((res) => setSep(res.data || {}))
      .catch((err) => {
        console.error('Erro ao buscar sepultado:', err)
        setFlashMessage('Erro ao carregar sepultado.', 'error')
      })

    // comentários (GET público) - primeira página
    buscarComentarios(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // carregar dados (nome/email) dos concessionários
  useEffect(() => {
    const ids = Array.isArray(sep?.concessionarios) ? sep.concessionarios : []
    if (!ids.length) {
      setConcessionariosInfo([])
      return
    }

    let isCancelled = false

    async function loadAll() {
      try {
        const results = await Promise.allSettled(
          ids.map((uid) =>
            api.get(`/users/${uid}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
          )
        )

        const list = results
          .filter(r => r.status === 'fulfilled' && r.value?.data?.user)
          .map(r => r.value.data.user)
          .map(u => ({
            _id: String(u._id),
            name: u.name,
            email: u.email,
          }))

        if (!isCancelled) setConcessionariosInfo(list)
      } catch (e) {
        if (!isCancelled) setConcessionariosInfo([])
      }
    }

    loadAll()
    return () => { isCancelled = true }
  }, [sep?.concessionarios, token])

  const buscarComentarios = async (pageArg = 1, append = false) => {
    setCarregandoComentarios(true)
    try {
      const { data } = await api.get(`/sepultados/${id}/comentarios`, {
        params: { page: pageArg, limit }
      })
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : [])
      setHasMore(Boolean(data?.hasMore))
      setPage(pageArg)
      setComentarios(prev => append ? [...prev, ...items] : items)
    } catch (err) {
      console.error('Erro ao buscar comentários:', err)
      if (!append) setComentarios([])
    } finally {
      setCarregandoComentarios(false)
    }
  }

  const carregarMais = async () => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    await buscarComentarios(page + 1, true)
    setLoadingMore(false)
  }

  // mini blacklist no client (só para UX; o backend bloqueia de verdade)
  const blocked = ['palavrão1', 'palavrão2', 'ofensa1', 'ofensa2']
  const contemProibido = (txt = '') => {
    const n = txt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    return blocked.some(w => n.includes(w.toLowerCase()))
  }

  const adicionarComentario = async (e) => {
    e.preventDefault()
    if (!novoComentario.trim()) return

    if (!token) {
      setFlashMessage('Você precisa estar logado para comentar.', 'error')
      return
    }

    if (contemProibido(novoComentario)) {
      setFlashMessage('Seu comentário contém termos não permitidos.', 'error')
      return
    }

    try {
      const { data } = await api.post(
        `/sepultados/${id}/comentarios`,
        { comentario: novoComentario }, // mantém conforme seu front atual
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setComentarios((prev) => [data, ...prev])
      setNovoComentario('')
      setFlashMessage('Comentário adicionado com sucesso!', 'success')
    } catch (err) {
      console.log('ADD-COMENT ERRO:', {
        status: err?.response?.status,
        data: err?.response?.data,
      })

      const status = err?.response?.status
      const data = err?.response?.data
      const backendMsg =
        (typeof data === 'string' ? data : data?.message || data?.error) ||
        (status === 422 ? 'Seu comentário contém termos não permitidos.' : null)

      if (status === 422) return setFlashMessage(backendMsg || 'Seu comentário contém termos não permitidos.', 'error')
      if (status === 429) return setFlashMessage(backendMsg || 'Muitas homenagens em pouco tempo. Tente novamente em instantes.', 'warning')
      if (status === 401) return setFlashMessage(backendMsg || 'Sua sessão expirou. Faça login novamente.', 'error')

      setFlashMessage(backendMsg || 'Erro ao adicionar comentário.', 'error')
    }
  }

  const podeApagar = (c) => {
    if (!roleLoaded) return false
    if (isAdmin) return true
    return userId && (String(c.user) === String(userId))
  }

  const removerComentario = async (cid) => {
    try {
      await api.delete(`/sepultados/${id}/comentarios/${cid}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setComentarios(prev => prev.filter(c => c._id !== cid))
      setFlashMessage('Comentário removido.', 'success')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao remover comentário.'
      setFlashMessage(msg, 'error')
    }
  }

  // 10/08/2025 10:23 (pt-BR, 24h)
  const mostrarCreatedAt = (v) => {
    if (!v) return ''
    try {
      const d = new Date(v)
      if (isNaN(d.getTime())) return String(v)
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    } catch {
      return String(v)
    }
  }

  const handleImageClick = (imageUrl) => setExpandedImage(imageUrl)
  const handleCloseModal = () => setExpandedImage(null)

  // --- IMAGENS (com fallback) ---
  const API = (process.env.REACT_APP_API || '').replace(/\/+$/, '')
  const imageList = Array.isArray(sep?.images) ? sep.images : []
  const imageSources = imageList
    .map(img => {
      const cleaned = typeof img === 'string' ? img.trim() : ''
      const isBad = !cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === '/'
      return !isBad ? `${API}/images/sepultados/${cleaned}` : '/sepultura-padrao.png'
    })
    .filter(Boolean)
  if (imageSources.length === 0 && sep?._id) imageSources.push('/sepultura-padrao.png')

  // --- ADMINISTRADORES (banner) ---
  const hasCons = Array.isArray(sep?.concessionarios) && sep.concessionarios.length > 0
  const adminDisplay = hasCons
    ? (concessionariosInfo.length > 0
        ? concessionariosInfo
            .map(u => (u?.name ? `${u.name}${u.email ? ` (${u.email})` : ''}` : (u?.email || u?._id)))
            .join(', ')
        : 'carregando administradores…')
    : 'Cemiterio Santa Faustina'

  return (
    <section className={styles.sepultado_details_container}>
      <div className={styles.sepultado_details_header}>
        <h1>{sep?.nome || 'Carregando...'}</h1>
      </div>

     

      {imageSources.length > 0 && (
        <div className={styles.sepultado_images}>
          {imageSources.map((src, index) => (
            <img
              src={src}
              alt={`${sep?.nome || 'Sepultado'} - foto ${index + 1}`}
              key={index}
              onClick={() => handleImageClick(src)}
              onError={(e) => { e.currentTarget.src = '/sepultura-padrao.png' }}
            />
          ))}
        </div>
      )}

      <div className={styles.main_content}>
        <div className={styles.left_column}>
          <div className={styles.info_section}>
            <h3>Dados Pessoais</h3>
            <div className={styles.info_grid}>
              <div className={styles.info_item}>
                <span className={styles.label}>Falecimento:</span>
                <span className={styles.value}>{mostrarData(sep?.dtFal)}</span>
              </div>
              <div className={styles.info_item}>
                <span className={styles.label}>Nascimento:</span>
                <span className={styles.value}>{mostrarData(sep?.dtNasc)}</span>
              </div>
              <div className={styles.info_item}>
                <span className={styles.label}>Idade:</span>
                <span className={styles.value}>{sep?.idade ?? 'Desconhecida'}</span>
              </div>
              <div className={styles.info_item}>
                <span className={styles.label}>Naturalidade:</span>
                <span className={styles.value}>{sep?.nacionalidade || 'Desconhecida'}</span>
              </div>
              <div className={styles.info_item}>
                <span className={styles.label}>Pai:</span>
                <span className={styles.value}>{sep?.pai || 'Informação desconhecida'}</span>
              </div>
              <div className={styles.info_item}>
                <span className={styles.label}>Mãe:</span>
                <span className={styles.value}>{sep?.mae || 'Informação desconhecida'}</span>
              </div>
            </div>
          </div>

          <div className={styles.info_section}>
            <h3>Dados da Sepultura</h3>
            <div className={styles.info_grid}>
              <div className={styles.info_item}>
                <span className={styles.label}>Cemitério:</span>
                <span className={styles.value}>{sep?.cemiterio || 'Informação desconhecida'}</span>
              </div>
              <div className={styles.info_item}>
                <span className={styles.label}>Rua:</span>
                <span className={styles.value}>{sep?.rua || 'Informação desconhecida'}</span>
              </div>
              <div className={styles.info_item}>
                <span className={styles.label}>Quadra:</span>
                <span className={styles.value}>{sep?.quadra || 'Informação desconhecida'}</span>
              </div>
              <div className={styles.info_item}>
                <span className={styles.label}>Placa:</span>
                <span className={styles.value}>{sep?.chapa || 'Informação desconhecida'}</span>
              </div>
              <div className={styles.info_item}>
                <span className={styles.label}>Tipo de Sepultura:</span>
                <span className={styles.value}>{sep?.tipoSepultura || 'Informação desconhecida'}</span>
              </div>
            </div>
          </div>

          {/* Seção de responsáveis / concessionários */}
          <div className={styles.info_section}>
            <h3>Responsável</h3>
            <div className={styles.info_grid}>
              {/* Dono criador (sempre existe) */}
             

              {/* Lista de concessionários (pode estar vazia) */}
              <div className={styles.info_item} style={{ display: 'block' }}>
                <span className={styles.label}>Moderador da página:</span>
                <div className={styles.value}>
                  {Array.isArray(sep?.concessionarios) && sep.concessionarios.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                      {concessionariosInfo.length > 0 ? (
                        concessionariosInfo.map((u) => (
                          <li key={u._id}>
                            <strong>{u.name}</strong>
                            
                            {userId && String(u._id) === String(userId) ? ' (você)' : ''}
                          </li>
                        ))
                      ) : (
                        // fallback: mostra apenas os IDs enquanto carrega nomes/emails
                        sep.concessionarios.map((cid) => (
                          <li key={String(cid)}>
                            <code style={{ fontSize: 12, color: '#9ca3af' }}>{String(cid)}</code>
                            {userId && String(cid) === String(userId) ? ' (você)' : ''}
                          </li>
                        ))
                      )}
                    </ul>
                  ) : (
                    <span>— Nenhum moderador atribuído.</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.epitafio_section}>
            <h3>Epitáfio</h3>
            <div className={styles.epitafio_content}>
              <p>"{sep?.epitafio || 'Descanse em paz'}"</p>
            </div>
          </div>
        </div>

        {/* Coluna da direita (comentários) */}
        <div className={styles.right_column}>
          <div className={styles.comments_section}>
            <h3>Homenagens</h3>

            <form onSubmit={adicionarComentario} className={styles.comment_form}>
              <textarea
                placeholder="Deixe sua homenagem..."
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                className={styles.comment_textarea}
                rows="4"
              />
              <button type="submit" className={styles.submit_button}>
                Adicionar Homenagem
              </button>
            </form>

            <div className={styles.comments_list}>
              {carregandoComentarios ? (
                <div className={styles.loading}>Carregando comentários...</div>
              ) : comentarios.length > 0 ? (
                <>
                  {comentarios.map((c, i) => (
                    <div key={c._id || i} className={styles.comment_item}>
                      <div className={styles.comment_header}>
                        <span className={styles.comment_author}>{c.autor || 'Anônimo'}</span>
                        <span className={styles.comment_date}>{mostrarCreatedAt(c.createdAt)}</span>
                        {podeApagar(c) && (
                          <button
                            type="button"
                            className={styles.delete_button}
                            onClick={() => removerComentario(c._id)}
                            title="Remover comentário"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      <p className={styles.comment_text}>{c.texto}</p>
                    </div>
                  ))}
                  {hasMore && (
                    <div className={styles.load_more_wrap}>
                      <button
                        onClick={carregarMais}
                        disabled={loadingMore}
                        className={styles.load_more_button}
                      >
                        {loadingMore ? 'Carregando…' : 'Carregar mais'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.no_comments}>
                  <p>Seja o primeiro a deixar uma homenagem.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {expandedImage && (
        <div className={styles.image_modal} onClick={handleCloseModal}>
          <div className={styles.modal_content} onClick={(e) => e.stopPropagation()}>
            <img
              src={expandedImage}
              alt="Imagem expandida"
              className={styles.expanded_image}
              onClick={handleCloseModal}
            />
            <button className={styles.close_button} onClick={handleCloseModal}>×</button>
          </div>
        </div>
      )}
    </section>
  )
}

export default SepultadoDetails
