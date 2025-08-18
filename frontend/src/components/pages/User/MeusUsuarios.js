
import api from '../../../utils/api';
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import styles from './../Sepultado/Dashboard.module.css';
import useFlashMessage from '../../../hooks/useFlashMessage';

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

  useEffect(() => {
    if (!me) return;

    if (me.role === 'admin') {
      fetchList('');
    } else {
      // para não-admin, “lista” com apenas o próprio registro
      setUsers([{
        _id: me._id, name: me.name, email: me.email, role: me.role, image: me.image, phone: me.phone
      }]);
    }
  }, [me]); // eslint-disable-line

  async function fetchList(query) {
    try {
      const res = await api.get(`/users?q=${encodeURIComponent(query)}&limit=${LIMIT}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data?.users || []);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao carregar usuários';
      setFlashMessage(msg, 'error');
    }
  }

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
        {users.map((u) => (
          <div className={styles.seplist_row} key={u._id}>
            <img
              src={u.image ? `${process.env.REACT_APP_API}/images/users/${u.image}` : `${process.env.REACT_APP_API}/images/users/default.jpg`}
              alt={u.name}
              width="60"
              height="60"
              style={{ borderRadius: '50%', objectFit: 'cover', marginRight: 12 }}
            />
            <span className="bold" style={{ minWidth: 160 }}>{u.name}</span>
            <span style={{ minWidth: 220 }}>{u.email}</span>
            <span style={{ minWidth: 140, opacity: .8 }}>{u.role}</span>

            <div className={styles.actions}>
              {(isAdmin || me?._id === u._id) && (
                <Link to={`/usuarios/edit/${u._id}`}>Editar</Link>
              )}
              {isAdmin && me?._id !== u._id && (
                <button onClick={() => removeUser(u._id)}>Excluir</button>
              )}
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className={styles.empty_state}>Nenhum usuário encontrado.</div>
        )}
      </div>
    </section>
  );
}
