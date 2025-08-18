import { useState, useEffect } from "react";
import formStyles from './Form.module.css';
import Input from './input';
import Select from "./Select";

function SepultadoForm({ handleSubmit, sepultadoData, btnText }) {
  const [sepultado, setSepultado] = useState(() => sepultadoData || {});
  const [preview, setPreview] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const tipoSepultura = ["Terra", "Laje", "Gaveta", "Jazigo", "Capela"];

  // --- Helpers de data (string BR) ---
  const toBR = (v) => {
    if (!v) return '';
    // já está em DD/MM/AAAA
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
    // veio em YYYY-MM-DD (ou YYYY-MM-DDTHH:mm:ss...)
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) {
      const [y, m, d] = v.substring(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    // tentou ISO/outro parseável -> converte
    const d = new Date(v);
    if (!isNaN(d)) {
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const yy = d.getUTCFullYear();
      return `${dd}/${mm}/${yy}`;
    }
    // mantém se não der pra interpretar
    return v;
  };

  const maskDateBR = (v) => {
    const digits = (v || '').replace(/\D/g, '').slice(0, 8); // DDMMYYYY
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const isDateBRValida = (s) => {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || '');
    if (!m) return false;
    const d = Number(m[1]), mth = Number(m[2]), y = Number(m[3]);
    if (mth < 1 || mth > 12 || d < 1 || d > 31 || y < 1000) return false;
    const diasNoMes = [31, (y%4===0 && y%100!==0) || (y%400===0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return d <= diasNoMes[mth - 1];
  };

  // Hidrata quando chega o sepultadoData (normaliza datas para BR)
  useEffect(() => {
    if (sepultadoData) {
      const imagensExistentes = sepultadoData.images || sepultadoData.image || [];
      setSepultado({
        ...sepultadoData,
        dtNasc: toBR(sepultadoData.dtNasc),
        dtFal: toBR(sepultadoData.dtFal),
        images: imagensExistentes,
      });
      setPreview(imagensExistentes);
    }
  }, [sepultadoData]);

  function onFileChange(e) {
    const files = Array.from(e.target.files || []);
    setNewFiles(files);
    setPreview(files.length ? files : (sepultado.images || []));
  }

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === 'dtNasc' || name === 'dtFal') {
      setSepultado((prev) => ({ ...prev, [name]: maskDateBR(value) }));
      return;
    }
    setSepultado((prev) => ({ ...prev, [name]: value }));
  }

  // monta payload: se tiver files, usa FormData; senão JSON
  function buildPayload() {
    const campos = [
      "nome","idade","dtNasc","dtFal","nacionalidade","mae","pai",
      "cemiterio","quadra","rua","chapa","epitafio","tipoSepultura","latitude","longitude"
    ];

    if (newFiles.length > 0) {
      const fd = new FormData();
      campos.forEach((k) => {
        if (sepultado[k] !== undefined && sepultado[k] !== null) fd.append(k, sepultado[k]);
      });
      newFiles.forEach((f) => fd.append("images", f));
      return { payload: fd, isFormData: true };
    }

    const json = {};
    campos.forEach((k) => {
      if (sepultado[k] !== undefined && sepultado[k] !== null) json[k] = sepultado[k];
    });
    return { payload: json, isFormData: false };
  }

  function submit(e) {
    e.preventDefault();

    // valida datas (obrigatórias no backend)
    if (!isDateBRValida(sepultado.dtNasc) || !isDateBRValida(sepultado.dtFal)) {
      alert('Digite datas válidas no formato DD/MM/AAAA.');
      return;
    }

    const { payload, isFormData } = buildPayload();
    handleSubmit(payload, { isFormData });
  }

  function renderImages() {
    if (preview.length > 0) {
      return preview.map((image, index) => {
        if (image instanceof File) {
          return (
            <img
              src={URL.createObjectURL(image)}
              alt={sepultado.nome || 'Sepultura'}
              key={`preview-${index}`}
            />
          );
        }
        const urlBase = process.env.REACT_APP_API;
        const imageUrl =
          image?.startsWith("http") || image?.startsWith("/")
            ? image
            : `${urlBase}/images/sepultados/${image}`;
        return (
          <img
            src={imageUrl}
            alt={sepultado.nome || 'Sepultura'}
            key={`existing-${index}`}
          />
        );
      });
    }
    return <p>Nenhuma imagem disponível</p>;
  }

  return (
    <form onSubmit={submit} className={formStyles.form_container}>
      <div className={formStyles.preview_sepultado_image}>
        {renderImages()}
      </div>

      <Input
        text="Imagens da sepultura"
        type="file"
        name="images"
        handleOnChange={onFileChange}
        multiple={true}
        accept="image/*"
      />

      <Input
        text="Nome do Ente"
        type="text"
        name="nome"
        placeholder="Digite o nome"
        handleOnChange={handleChange}
        value={sepultado.nome || ''}
        required
      />

      <Input
        text="Idade"
        type="number"
        name="idade"
        placeholder="Digite a idade"
        handleOnChange={handleChange}
        value={sepultado.idade || ''}
        min="0"
        max="150"
      />

      {/* DATAS EM STRING BR (DD/MM/AAAA) */}
      <Input
        text="Data de Nascimento"
        type="text"
        name="dtNasc"
        placeholder="DD/MM/AAAA"
        handleOnChange={handleChange}
        value={sepultado.dtNasc || ''}
        inputMode="numeric"
        maxLength={10}
        pattern="\d{2}/\d{2}/\d{4}"
        required
      />

      <Input
        text="Data de Falecimento"
        type="text"
        name="dtFal"
        placeholder="DD/MM/AAAA"
        handleOnChange={handleChange}
        value={sepultado.dtFal || ''}
        inputMode="numeric"
        maxLength={10}
        pattern="\d{2}/\d{2}/\d{4}"
        required
      />

      <Input
        text="nacionalidade"
        type="text"
        name="nacionalidade"
        placeholder="Digite a naturalidade"
        handleOnChange={handleChange}
        value={sepultado.nacionalidade || ''}
      />

      <Input
        text="Mãe"
        type="text"
        name="mae"
        placeholder="Digite a Mãe"
        handleOnChange={handleChange}
        value={sepultado.mae || ''}
      />

      <Input
        text="Pai"
        type="text"
        name="pai"
        placeholder="Digite o Pai"
        handleOnChange={handleChange}
        value={sepultado.pai || ''}
      />

      <Input
        text="Cemitério"
        type="text"
        name="cemiterio"
        placeholder="Digite o Cemitério"
        handleOnChange={handleChange}
        value={sepultado.cemiterio || ''}
      />

      <Input
        text="Quadra"
        type="text"
        name="quadra"
        placeholder="Digite a quadra"
        handleOnChange={handleChange}
        value={sepultado.quadra || ''}
      />

      <Input
        text="Rua"
        type="text"
        name="rua"
        placeholder="Digite a rua"
        handleOnChange={handleChange}
        value={sepultado.rua || ''}
      />

      <Input
        text="Chapa"
        type="text"
        name="chapa"
        placeholder="Digite a chapa"
        handleOnChange={handleChange}
        value={sepultado.chapa || ''}
      />

      <Input
        text="Epitáfio (Opcional)"
        type="textarea"
        name="epitafio"
        placeholder="Conte uma história de vida"
        handleOnChange={handleChange}
        value={sepultado.epitafio || ''}
      />

      <Select
        name="tipoSepultura"
        text="Tipo (Opcional)"
        options={tipoSepultura}
        handleOnChange={handleChange}
        value={sepultado.tipoSepultura || ''}
      />

      <input type="submit" value={btnText} />
    </form>
  );
}

export default SepultadoForm;
