import { useEffect, useState } from 'react';
import Input from './input';
import Select from './Select';
import styles from './Form.module.css';

export default function UsuarioForm({
  handleSubmit,
  userData = {},
  btnText = 'Salvar',
  mode = 'edit',           // 'create' quando admin cria usuário
  canEditRole = false,     // admin pode escolher role
  requirePassword = false, // em create exige senha
  disabled = false,
}) {
  const [form, setForm] = useState({
    name: '',
    cpf: '',
    email: '',
    phone: '',
    role: 'usuario',
    password: '',
    confirmpassword: '',
    image: null,
  });

  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (userData && userData._id) {
      setForm((prev) => ({
        ...prev,
        name: userData.name || '',
        cpf: userData.cpf || '',
        email: userData.email || '',
        phone: userData.phone || '',
        role: userData.role || 'usuario',
      }));
      setPreview(
        userData.image
          ? `${process.env.REACT_APP_API}/images/users/${userData.image}`
          : null
      );
    }
  }, [userData]);

  function onChange(e) {
    const { name, value, files } = e.target;
    if (name === 'image') {
      const file = (files && files[0]) || null;
      setForm((f) => ({ ...f, image: file }));
      setPreview(file ? URL.createObjectURL(file) : null);
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  function submit(e) {
    e.preventDefault();

    if (requirePassword) {
      if (!form.password || !form.confirmpassword) {
        alert('Preencha a senha e a confirmação.');
        return;
      }
      if (form.password !== form.confirmpassword) {
        alert('As senhas não conferem.');
        return;
      }
    }

    // Sempre enviamos CPF (campo obrigatório)
    const baseFields = ['name', 'cpf', 'email', 'phone', 'role'];

    if (form.image || requirePassword) {
      // FormData (com imagem e/ou senha)
      const fd = new FormData();
      baseFields.forEach((k) => {
        if (form[k] !== undefined && form[k] !== '') fd.append(k, form[k]);
      });
      if (requirePassword) {
        fd.append('password', form.password);
        fd.append('confirmpassword', form.confirmpassword);
      }
      if (form.image) fd.append('image', form.image);
      handleSubmit(fd, { isFormData: true });
    } else {
      // JSON simples
      const json = {};
      baseFields.forEach((k) => (json[k] = form[k]));
      handleSubmit(json, { isFormData: false });
    }
  }

  return (
    <form onSubmit={submit} className={styles.form_container}>
      <div className={styles.preview_sepultado_image}>
        {preview ? (
          <img src={preview} alt={form.name || 'Usuário'} />
        ) : (
          <p>Sem foto</p>
        )}
      </div>

      <Input
        text="Foto (JPG/PNG)"
        type="file"
        name="image"
        handleOnChange={onChange}
        accept="image/*"
        disabled={disabled}
      />

      <Input
        text="Nome"
        name="name"
        type="text"
        value={form.name}
        handleOnChange={onChange}
        required
        disabled={disabled}
      />

      <Input
        text="CPF"
        name="cpf"
        type="text"
        value={form.cpf}
        handleOnChange={onChange}
        required
        disabled={disabled}
      />

      <Input
        text="E-mail"
        name="email"
        type="email"
        value={form.email}
        handleOnChange={onChange}
        required
        disabled={disabled}
      />

      <Input
        text="Telefone"
        name="phone"
        type="text"
        value={form.phone}
        handleOnChange={onChange}
        required
        disabled={disabled}
      />

      {(canEditRole || mode === 'create') && (
        <Select
          name="role"
          text="Papel"
          options={['usuario', 'concessionario', 'admin']}
          handleOnChange={onChange}
          value={form.role}
          disabled={disabled || !canEditRole}
        />
      )}

      {requirePassword && (
        <>
          <Input
            text="Senha"
            name="password"
            type="password"
            value={form.password}
            handleOnChange={onChange}
            required
            disabled={disabled}
          />
          <Input
            text="Confirmar Senha"
            name="confirmpassword"
            type="password"
            value={form.confirmpassword}
            handleOnChange={onChange}
            required
            disabled={disabled}
          />
        </>
      )}

      <input type="submit" value={btnText} disabled={disabled} />
    </form>
  );
}
