  
  import api from '../../../utils/api'
  import { useState,useEffect } from 'react'
  import styles from './Profile.module.css'
  import formStyles from '../../form/Form.module.css'
  import Input from '../../form/input.js'
  import RoundedImage  from '../../layout/RoundedImage'
  import useFlashMessage from '../../../hooks/useFlashMessage.js'
  
  
  function Profile(){

    const [user,setUser] = useState({})
    const [preview, setPreview] = useState()
    const [token] = useState(localStorage.getItem('token')|| '')
    const {setFlashMessage} = useFlashMessage();




   // Profile.js - useEffect corrigido

useEffect(() => {

  if (!token) {
    return;
  }

  api.get('/users/checkuser', {
    headers: {
     
      Authorization: `Bearer ${token}`
    }
  })
  .then((response) => {
    setUser(response.data);
  })
  .catch((err) => {
    // Adicionar um log de erro mais informativo ajuda na depuração
    console.error("Erro ao buscar dados do usuário:", err);
    
  });
}, [token]);







    function onFileChange(e){

     setPreview(e.target.files[0])

  const updatedUser = { ...user, [e.target.name]: e.target.files[0] }
  setUser(updatedUser) //  Agora o estado será atualizado corretamente
    }

     function handleChange(e){
  const updatedUser = { ...user, [e.target.name]: e.target.value }
  setUser(updatedUser) //  Agora o estado será atualizado corretamente
    }










async function handleSubmit(e) {
  e.preventDefault();
  let msgType = 'success';
  const formData = new FormData();

  // Omitindo a senha e a confirmação de senha se estiverem vazias
  const userDataToSubmit = { ...user };
  if (!userDataToSubmit.password) {
    delete userDataToSubmit.password;
  }
  delete userDataToSubmit.confirmpassword; 

  Object.keys(userDataToSubmit).forEach((key) => {
    formData.append(key, userDataToSubmit[key]);
  });

  const data = await api.patch(`/users/edit/${user._id}`, formData, {
    headers: {
      
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  }).then((response) => {
     return response.data;
  }).catch((err) => {
      msgType = 'error';
      return err.response.data;
  });

  setFlashMessage(data.message, msgType);
}











 return(
    <section className={styles.form_container}>
         
       <div className= {styles.profile_header}>
        <h2 className={styles.title}>Perfil</h2>
        {(user.image || preview) && (
            <RoundedImage src={preview? URL.createObjectURL(preview) : `${process.env.REACT_APP_API}/images/users/${user.image}`

            }
            alt={user.name}
            />
        )}
       </div>
        <form onSubmit={handleSubmit} className={formStyles.form_container}>
            <Input 
            text="Imagem"
            type='file'
            name='image'
            handleOnChange = {onFileChange}
            />
             <Input 
            text="E-mail"
            type='email'
            name='email'
            placeholder='Digite o seu e-mail'
            handleOnChange = {handleChange}
            value={user.email || ''}
            />

             <Input 
            text="Nome"
            type='text'
            name='name'
            placeholder='Digite o seu nome'
            handleOnChange = {handleChange}
            value={user.name || ''}
            />

             <Input 
            text="Telefone"
            type='text'
            name='phone'
            placeholder='Digite o seu telefone'
            handleOnChange = {handleChange}
            value={user.phone || ''}
            />

            <Input 
            text="Senha"
            type='password'
            name='password'
            placeholder='Digite o seu senha'
            handleOnChange = {handleChange}
            
            />

             <Input 
            text="Confirmar senha"
            type='password'
            name='confirmpassword'
            placeholder='Confirme a sua senha'
            handleOnChange = {handleChange}
             />
            <input type="submit" value="Editar"/>


        </form>
    </section>
 )

 }

 export default Profile