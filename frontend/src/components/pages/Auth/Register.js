import { useState, useContext } from 'react'
import Input from '../../form/input'               // lembrete: "I" maiúsculo se for Input.jsx
import styles from '../../form/Form.module.css'
import { Link } from 'react-router-dom'
import { IMaskInput } from 'react-imask'

// context
import { Context } from '../../../context/UserContext'

function Register() {
  const [user, setUser] = useState({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    password: '',
    confirmpassword: '',
  })

  const { register } = useContext(Context)

  function handleOnChange(e) {
    const { name, value } = e.target
    setUser((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      ...user,
      cpf: (user.cpf || '').replace(/\D/g, ''),
      phone: (user.phone || '').replace(/\D/g, ''),
    }
    register(payload)
  }

  return (
    <section className={styles.form_container}>
      <h2>Cadastro de Usuário</h2>

      <form onSubmit={handleSubmit}>
        <Input
          text="Nome"
          type="text"
          name="name"
          placeholder="Digite o seu nome"
          value={user.name}
          onChange={handleOnChange}
          autoComplete="name"
        />

        {/* CPF com máscara — mesmo visual dos demais campos */}
        <div className={styles.form_control}>
          <label htmlFor="cpf">CPF</label>
          <IMaskInput
            id="cpf"
            name="cpf"
            mask="000.000.000-00"
            value={user.cpf || ''}
            onAccept={(val) => setUser((prev) => ({ ...prev, cpf: val }))}
            inputMode="numeric"
            autoComplete="cpf"
            placeholder="Digite o seu CPF"
            className={styles.input}
          />
        </div>

        {/* Telefone com máscara dinâmica (fixo/celular) — mesmo visual */}
        <div className={styles.form_control}>
          <label htmlFor="phone">Telefone</label>
          <IMaskInput
            id="phone"
            name="phone"
            mask={[
              { mask: '(00) 0000-0000' },   // fixo (10 dígitos)
              { mask: '(00) 00000-0000' },  // celular (11 dígitos)
            ]}
            dispatch={(appended, masked) => {
              const digits = (masked.value + appended).replace(/\D/g, '')
              return digits.length > 10 ? masked.compiledMasks[1] : masked.compiledMasks[0]
            }}
            value={user.phone || ''}
            onAccept={(val) => setUser((prev) => ({ ...prev, phone: val }))}
            inputMode="numeric"
            autoComplete="tel"
            placeholder="Digite o seu telefone"
            className={styles.input}
          />
        </div>

        <Input
          text="E-mail"
          type="email"
          name="email"
          placeholder="Digite o seu e-mail"
          value={user.email}
          onChange={handleOnChange}
          autoComplete="email"
        />

        <Input
          text="Senha"
          type="password"
          name="password"
          placeholder="Digite sua senha"
          value={user.password}
          onChange={handleOnChange}
          autoComplete="new-password"
        />

        <Input
          text="Confirmação de Senha"
          type="password"
          name="confirmpassword"
          placeholder="Confirme sua senha"
          value={user.confirmpassword}
          onChange={handleOnChange}
          autoComplete="new-password"
        />

        <input type="submit" value="Cadastrar" />
      </form>

      <p>
        Já tem conta? <Link to="/login">Clique aqui</Link>
      </p>
    </section>
  )
}

export default Register
