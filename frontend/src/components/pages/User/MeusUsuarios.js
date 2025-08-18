import api from '../../../utils/api';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styles from './../Sepultado/Dashboard.module.css';
import useFlashMessage from '../../../hooks/useFlashMessage';

// 1. Importe o componente RoundedImage para padronizar o visual
import RoundedImage from '../../layout/RoundedImage';

const LIMIT = 20;

export default function MeusUsuarios() {
  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [q, setQ] = useState('');
  const { setFlashMessage } = useFlashMessage();

  const readToken = useCallback(() => {
    const fromAuth = JSON.parse(localStorage.getItem('auth') || '{}')?.token;
    if (fromAuth) return fromAuth;
    const raw = localStorage.getItem('token');
    if (!raw) return '';
    try { return JSON.parse(raw) } catch { return raw.replace(/^"+|"+$/g, '') }
  }, []);
  const token = readToken();

  useEffect(() => {
    if (!token) return;

    api.get('/users/checkuser', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setMe(res.data))
      .catch(() => setFlashMessage('Falha ao checar usuário.', 'error'));
  }, [token, setFlashMessage]);

  const fetchList = useCallback(async (query) => {
    try {
      const res = await api.get(`/users?q=${encodeURIComponent(query)}&limit=${LIMIT}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data?.users || []);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao carregar usuários';
      setFlashMessage(msg, 'error');
    }
  }, [token, setFlashMessage]);

  useEffect(() => {
    if (!me) return;

    if (me.role === 'admin') {
      fetchList('');
    } else {
      setUsers([{
        _id: me._id, name: me.name, email: me.email, role: me.role, image: me.image, phone: me.phone
      }]);
    }
  }, [me, fetchList]);

  async function removeUser(id) {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      const res = await api.delete(`/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(prev => prev.filter(u => u._id !== id));
      setFlashMessage(res.data?.message || 'Excluído com sucesso!', 'success');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao excluir';
      setFlashMessage(msg, 'error');
    }
  }

  const canAdd = me?.role === 'admin';
  const isAdmin = me?.role === 'admin';

  function onSubmitFilter(e) {
    e.preventDefault();
    if (isAdmin) fetchList(q);
  }

  return (
    <section>
      <h2>Gerenciamento de Usuários</h2>

      <div className={styles.seplist_header}>
        {canAdd ? (
          <Link to="/usuarios/add">Adicionar Usuário</Link>
        ) : (
          <span className={styles.helptext}>Você pode editar apenas o seu próprio perfil.</span>
        )}
      </div>

      {isAdmin && (
        <form onSubmit={onSubmitFilter} className={styles.filter_bar}>
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            className={styles.filter_input}
          />
          <button type="submit" className={styles.filter_button}>Pesquisar</button>
          {q && (
            <button type="button" className={styles.filter_button} onClick={() => { setQ(''); fetchList(''); }}>
              Limpar
            </button>
          )}
        </form>
      )}

      <div className={styles.seplist_container}>
        {users.map((user) => {
          // --- INÍCIO DA NOSSA LÓGICA DE IMAGEM PADRONIZADA ---
          const API = (process.env.REACT_APP_API || '').replace(/\/+$/, '');
          
          // O campo de imagem para usuário é 'image' (singular)
          const raw = user?.image;
          const cleaned = typeof raw === 'string' ? raw.trim() : '';
          const isBad = !cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === '/';
          
          // A URL final, usando o fallback local para 'usuario-padrao.jpg'
          const srcImg = !isBad
            ? `${API}/images/users/${cleaned}`
            : '/usuario-padrao.jpg'; // <-- Fallback para a imagem na pasta /public
          // --- FIM DA LÓGICA ---

          return (
            <div className={styles.seplist_row} key={user._id}>
              {/* 2. Usando o componente RoundedImage */}
              <RoundedImage
                src={srcImg}
                alt={user.name}
                width="px75" // Usando uma classe de tamanho padrão do componente
              />
              <span className="bold" style={{ minWidth: 160, marginLeft: '12px' }}>{user.name}</span>
              <span style={{ minWidth: 220 }}>{user.email}</span>
              <span style={{ minWidth: 140, opacity: .8 }}>{user.role}</span>

              <div className={styles.actions}>
                {(isAdmin || me?._id === user._id) && (
                  <Link to={`/usuarios/edit/${user._id}`}>Editar</Link>
                )}
                {isAdmin && me?._id !== user._id && (
                  <button onClick={() => removeUser(user._id)}>Excluir</button>
                )}
              </div>
            </div>
          )
        })}

        {users.length === 0 && (
          <div className={styles.empty_state}>Nenhum usuário encontrado.</div>
        )}
      </div>
    </section>
  );
}
