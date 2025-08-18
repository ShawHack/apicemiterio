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

  // Busca dados (GET público)
  // CORREÇÃO PRINCIPAL: Removido 'sep' das dependências para evitar loop infinito
  useEffect(() => {
    api
      .get(`/sepultados/${id}`)
      .then((res) => setSep(res.data))
      .catch((err) => {
        console.error('Erro ao buscar sepultado:', err);
        setFlashMessage('Erro ao carregar dados do sepultado.', 'error');
      });
  }, [id, setFlashMessage]); // Apenas 'id' e 'setFlashMessage' como dependências

  // Recebe (payload, { isFormData }) do SepultadoForm
  const updateSep = useCallback(async (payload, { isFormData }) => {
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
        `sepultados/${id}`,           // usa o id da URL
        payload,                      // FormData OU JSON
        { headers }
      );

      setFlashMessage(res.data?.message || 'Registro atualizado com sucesso!', 'success');
      
      // CORREÇÃO SECUNDÁRIA: Redireciona para a lista de sepultados após salvar para evitar loop
      navigate(`/meussepultados`); // Redireciona para a lista

    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao atualizar registro';
      setFlashMessage(msg, 'error');
    }
  }, [id, navigate, setFlashMessage]); // Dependências para useCallback

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
