// imports atuais...
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import UsuarioForm from '../../form/UsuarioForm';
import useFlashMessage from '../../../hooks/useFlashMessage';

export default function EditUsuario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setFlashMessage } = useFlashMessage();
  const [user, setUser] = useState(null);
  const [myRole, setMyRole] = useState('usuario');
  const [newRole, setNewRole] = useState('usuario');

  const readToken = useCallback(() => {
    const fromAuth = JSON.parse(localStorage.getItem('auth') || '{}')?.token;
    if (fromAuth) return fromAuth;
    const raw = localStorage.getItem('token');
    if (!raw) return '';
    try { return JSON.parse(raw) } catch { return raw.replace(/^"+|"+$/g, '') }
  }, []);
  const token = readToken();

  useEffect(() => {
    // quem sou eu (para saber se sou admin)
    const auth = JSON.parse(localStorage.getItem('auth') || '{}');
    if (auth?.role) setMyRole(auth.role);
  }, []);

  useEffect(() => {
    api.get(`/users/${id}`)
      .then(res => {
        const u = res.data?.user || res.data;
        setUser(u);
        setNewRole(u?.role || 'usuario');
      })
      .catch(() => setFlashMessage('Erro ao carregar usuário.', 'error'));
  }, [id, setFlashMessage]);

  const updateUser = useCallback(async (payload, { isFormData }) => {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      };
      const res = await api.patch(`/users/${id}`, payload, { headers });
      setFlashMessage(res.data?.message || 'Perfil atualizado!', 'success');

      // Se o admin alterou o papel, chama o endpoint dedicado
      if (myRole === 'admin' && newRole && newRole !== user.role) {
        await api.patch(`/users/${id}/role`, { role: newRole }, { headers: { Authorization: `Bearer ${token}` } });
        setFlashMessage('Papel atualizado com sucesso!', 'success');
      }

      navigate('/meuusuario');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao atualizar usuário';
      setFlashMessage(msg, 'error');
    }
  }, [id, token, myRole, newRole, user, navigate, setFlashMessage]);

  return (
    <section>
      <h2>Editar Usuário</h2>

      {user ? (
        <>
          {/* Formulário de dados básicos (nome, email, foto) */}
          <UsuarioForm
            handleSubmit={updateUser}
            userData={user}
            btnText="Salvar"
            mode="edit"
            canEditRole={false}      // role será trocado no painel abaixo
            requirePassword={false}
          />

          {/* Painel de papel — somente para admin */}
          {myRole === 'admin' && (
            <div style={{ marginTop: 24, padding: 16, border: '2px solid #075b76', borderRadius: 8 }}>
              <h3 style={{ marginTop: 0, color: '#075b76' }}>Papel do Usuário</h3>
              <label style={{ marginRight: 8 }}>Selecionar papel:</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{ padding: 6, borderRadius: 6, border: '1px solid #ccc' }}
              >
                <option value="usuario">Usuário</option>
                <option value="concessionario">Concessionário</option>
                <option value="admin">Admin</option>
              </select>

              <p style={{ marginTop: 8, fontSize: 12, opacity: .8 }}>
                Dica: use com cautela. Você não pode remover o próprio papel de admin.
              </p>
            </div>
          )}
        </>
      ) : (
        <p>Carregando...</p>
      )}
    </section>
  );
}
