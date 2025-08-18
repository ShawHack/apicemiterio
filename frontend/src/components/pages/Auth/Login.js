 import { useState, useContext } from "react"
 import Input from '../../form/input'
 import styles from '../../form/Form.module.css'
 import {Link}from 'react-router-dom'

 //context
 import { Context } from "../../../context/UserContext"
 
 
 
 
 function Login() {
  const [user, setUser] = useState({})
  const { login } = useContext(Context)

  function handleChange(e){
    setUser(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e){
    e.preventDefault()
    login(user)
  }

  return (
    <section className={styles.form_container}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <Input
          text="E-mail"
          type="email"
          name="email"
          placeholder="Digite o seu e-mail"
          handleOnChange={handleChange}
          value={user.email || ''}          
        />
        <Input
          text="Senha"
          type="password"
          name="password"
          placeholder="Digite sua senha"
          handleOnChange={handleChange}
          value={user.password || ''}        
        />
        <input type="submit" value="Entrar" />
      </form>

      <p>Não tem conta? <Link to="/register">Clique aqui</Link></p>
    </section>
  )
}

 export default Login