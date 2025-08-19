// src/components/pages/sepultados/EditSepultado.js
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../utils/api';

import styles from './AddSepultado.module.css'; // reaproveitando o estilo
import SepultadoForm from '../../form/SepultadoForm';
import useFlashMessage from '../../../hooks/useFlashMessage';

function EditSepultado() {
  const [sep, setSep] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const { setFlashMessage } = useFlashMessage();

  // Carrega o registro (GET público)
  useEffect(() => {
    api
      .get(`/sepultados/${id}`)
      .then((res) => setSep(res.data))
      .catch((err) => {
        console.error('Erro ao buscar sepultado:', err);
        setFlashMessage('Erro ao carregar dados do sepultado.', 'error');
      });
  }, [id, setFlashMessage]);

  // Atualiza (somente dados do formulário; nada de concessionários aqui)
  const updateSep = useCallback(
    async (payload, { isFormData }) => {
      const token = localStorage.getItem('token');
      if (!token) {
        setFlashMessage('Você precisa estar logado.', 'error');
        return;
      }

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        };

        const res = await api.patch(
          `sepultados/${id}`,
          payload, // FormData OU JSON (sem mexer em concessionários)
          { headers }
        );

        setFlashMessage(res.data?.message || 'Registro atualizado com sucesso!', 'success');
        navigate('/meussepultados');
      } catch (err) {
        const msg = err?.response?.data?.message || 'Erro ao atualizar registro';
        setFlashMessage(msg, 'error');
      }
    },
    [id, navigate, setFlashMessage]
  );

  return (
    <section>
      <div className={styles.addsep_header}>
        <h2>Editando as informações {sep?.nome ? `de: ${sep.nome}` : ''}</h2>
        <p>Depois da edição, os dados serão atualizados no sistema.</p>
      </div>

      {sep ? (
        <SepultadoForm
          handleSubmit={updateSep}
          btnText="Atualizar"
          sepultadoData={sep}
        />
      ) : (
        <p>Carregando...</p>
      )}
    </section>
  );
}

export default EditSepultado;
