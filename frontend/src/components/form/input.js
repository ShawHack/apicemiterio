// input.jsx
import styles from './input.module.css'

function Input({
  type = 'text',
  text,
  name,
  placeholder,
  handleOnChange,
  value,
  multiple,
  ...rest
}) {
  if (type === 'textarea') {
    return (
      <div className={styles.form_control}>
        <label htmlFor={name}>{text}:</label>
        <textarea
          id={name}
          name={name}
          placeholder={placeholder}
          onChange={handleOnChange}
          value={value ?? ''}
          {...rest}
        />
      </div>
    )
  }

  const inputProps =
    type === 'file'
      ? { type, name, id: name, placeholder, onChange: handleOnChange, ...(multiple ? { multiple: true } : {}), ...rest }
      : { type, name, id: name, placeholder, onChange: handleOnChange, value: value ?? '', ...(multiple ? { multiple: true } : {}), ...rest }

  return (
    <div className={styles.form_control}>
      <label htmlFor={name}>{text}:</label>
      <input {...inputProps} />
    </div>
  )
}

export default Input
