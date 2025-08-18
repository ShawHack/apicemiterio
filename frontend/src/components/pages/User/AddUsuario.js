
import styles from './../Sepultado/AddSepultado.module.css';
import api from '../../../utils/api';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UsuarioForm from '../../form/UsuarioForm';
import useFlashMessage from '../../../hooks/useFlashMessage';

export default function AddUsuario() {
  const navigate = useNavigate();
  const { setFlashMessage } = useFlashMessage();
  const [token] = useState(localStorage.getItem('token') || '');

  async function createUser(payload, { isFormData }) {
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      };
      const res = await api.post('/users/admin-create', payload, { headers });
      setFlashMessage(res.data?.message || 'Usuário criado!', 'success');
      navigate('/meuusuario'); // volta para a lista
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao criar usuário';
      setFlashMessage(msg, 'error');
    }
  }

  return (
    <section className={styles.addsep_header}>
      <div>
        <h2>Novo Usuário</h2>
        <p>Crie um usuário do sistema. Apenas administradores têm acesso.</p>
      </div>

      <UsuarioForm
        handleSubmit={createUser}
        btnText="Cadastrar"
        mode="create"
        canEditRole
        requirePassword
      />
    </section>
  );
}
