import { useState, useEffect } from 'react'
import styles from './RoundedImage.module.css'

function RoundedImage({ src, alt, width }) {
  const [source, setSource] = useState(src)

  // Fallback no BACKEND (você confirmou que funciona)
  const API = (process.env.REACT_APP_API || '').replace(/\/+$/, '')
  const BACKEND_FALLBACK = `${API}/images/sepultados/sepultura-padrao.png`

  // Fallback LOCAL (caso REACT_APP_API não esteja setado ou em build estático)
  const LOCAL_FALLBACK = '/images/sepultados/sepultura-padrao.png'

  // Escolhe qual fallback usar (se API existir usa backend, senão usa local)
  const FALLBACK = API ? BACKEND_FALLBACK : LOCAL_FALLBACK

  useEffect(() => {
    setSource(src)
  }, [src])

  return (
    <img
      className={`${styles.rounded_image} ${styles[width]}`}
      src={source}
      alt={alt}
      onError={() => {
        if (source !== FALLBACK) setSource(FALLBACK)
      }}
    />
  )
}

export default RoundedImage
