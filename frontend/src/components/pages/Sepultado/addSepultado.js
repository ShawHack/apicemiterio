import styles from './AddSepultado.module.css'
import api from '../../../utils/api'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// components
import SepultadoForm from '../../form/SepultadoForm'

// hooks
import useFlashMessage from '../../../hooks/useFlashMessage'

function AddSepultado() {
  const navigate = useNavigate()
  const { setFlashMessage } = useFlashMessage()

  // token/role guard (admin-only)
  const [token] = useState(localStorage.getItem('token') || '')
  const authJson = JSON.parse(localStorage.getItem('auth') || '{}')
  const role = authJson.role || localStorage.getItem('role') || 'usuario'

  useEffect(() => {
    if (role !== 'admin') {
      setFlashMessage('Acesso restrito: somente administradores podem criar sepultados.', 'error')
      navigate('/') // ou outra rota pública
    }
  }, [role, navigate, setFlashMessage])

  // recebe (payload, { isFormData }) do SepultadoForm
  async function registerSepultado(payload, { isFormData }) {
    let msgType = 'success'

    try {
      const headers = {
        Authorization: `Bearer ${token}`, // não usar JSON.parse() aqui
        // não setar Content-Type quando for FormData
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      }

      const res = await api.post(
        'sepultados/create',
        payload,
        { headers }
      )

      setFlashMessage(res.data.message || 'Criado com sucesso!', 'success')
      // seu App usa /sepultados/meumemorial
      navigate('/sepultados/meumemorial')
    } catch (err) {
      msgType = 'error'
      const msg = err?.response?.data?.message || 'Erro ao criar sepultado'
      setFlashMessage(msg, msgType)
    }
  }

  return (
    <section className={styles.addsep_header}>
      <div>
        <h2>Criação de Memorial</h2>
        <p>
          Após o registro, o ente ficará disponível para localização dentro do
          cemitério e poderá receber futuras homenagens de amigos e familiares.
        </p>
      </div>

      <SepultadoForm handleSubmit={registerSepultado} btnText="Cadastrar" />
    </section>
  )
}

export default AddSepultado
