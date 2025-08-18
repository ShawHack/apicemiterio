
import { useEffect, useState } from 'react';
import Input from './input';
import Select from './Select';
import styles from './Form.module.css';

export default function UsuarioForm({
  handleSubmit,
  userData = {},
  btnText = 'Salvar',
  mode = 'edit',              // 'create' para admin criar usuário
  canEditRole = false,        // admin criando pode escolher role
  requirePassword = false,    // no create exige senha
}) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', role: 'usuario',
    password: '', confirmpassword: '', image: null
  });
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (userData && userData._id) {
      setForm((prev) => ({
        ...prev,
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        role: userData.role || 'usuario',
      }));
      setPreview(userData.image ? `${process.env.REACT_APP_API}/images/users/${userData.image}` : null);
    }
  }, [userData]);

  function onChange(e) {
    const { name, value, files } = e.target;
    if (name === 'image') {
      const file = files?.[0] || null;
      setForm((f) => ({ ...f, image: file }));
      setPreview(file ? URL.createObjectURL(file) : preview);
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  function submit(e) {
    e.preventDefault();
    if (requirePassword && (!form.password || !form.confirmpassword)) {
      alert('Preencha a senha e a confirmação.');
      return;
    }
    if (requirePassword && form.password !== form.confirmpassword) {
      alert('As senhas não conferem.');
      return;
    }

    // monta payload
    if (form.image || requirePassword) {
      const fd = new FormData();
      ['name','email','phone','role','password','confirmpassword'].forEach(k => {
        if (form[k] !== undefined && form[k] !== '') fd.append(k, form[k]);
      });
      if (form.image) fd.append('image', form.image);
      handleSubmit(fd, { isFormData: true });
    } else {
      const json = { name: form.name, email: form.email };
      handleSubmit(json, { isFormData: false });
    }
  }

  return (
    <form onSubmit={submit} className={styles.form_container}>
      <div className={styles.preview_sepultado_image}>
        {preview ? <img src={preview} alt={form.name || 'Usuário'} /> : <p>Sem foto</p>}
      </div>

      <Input
        text="Foto (JPG/PNG)"
        type="file"
        name="image"
        handleOnChange={onChange}
        accept="image/*"
      />

      <Input text="Nome" name="name" type="text" value={form.name} handleOnChange={onChange} required />
      <Input text="E-mail" name="email" type="email" value={form.email} handleOnChange={onChange} required />

      {mode === 'create' && (
        <>
          <Input text="Telefone" name="phone" type="text" value={form.phone} handleOnChange={onChange} required />
          {canEditRole && (
            <Select
              name="role"
              text="Papel"
              options={['usuario','concessionario','admin']}
              handleOnChange={onChange}
              value={form.role}
            />
          )}
        </>
      )}

      {requirePassword && (
        <>
          <Input text="Senha" name="password" type="password" value={form.password} handleOnChange={onChange} required />
          <Input text="Confirmar Senha" name="confirmpassword" type="password" value={form.confirmpassword} handleOnChange={onChange} required />
        </>
      )}

      <input type="submit" value={btnText} />
    </form>
  );
}
