import api from '../../utils/api' 
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import styles from './Home.module.css'

// Não precisamos mais do RoundedImage aqui, já que vamos usar a div
// import RoundedImage from '../layout/RoundedImage' 

function Home() {
    const [seps, setSeps] = useState([])
    const [expandedImage, setExpandedImage] = useState(null)

    
    
    
    
    
    // Em Home.js

useEffect(() => {
    api.get('/sepultados').then((response) => {
        // --- INÍCIO DO CÓDIGO DE DEPURAÇÃO ---
        
        // 1. Vamos imprimir a resposta completa no console.
        console.log('Resposta completa da API:', response.data);

        // 2. Agora, vamos tentar adivinhar o formato correto.
        // O código abaixo tenta encontrar o array em diferentes chaves comuns.
        let sepultadosArray = [];
        if (Array.isArray(response.data)) {
            // Caso A: A resposta é o próprio array.
            sepultadosArray = response.data;
        } else if (Array.isArray(response.data.sepultados)) {
            // Caso B: A chave é "sepultados" (plural).
            sepultadosArray = response.data.sepultados;
        } else if (Array.isArray(response.data.sepultado)) {
            // Caso C: A chave é "sepultado" (singular).
            sepultadosArray = response.data.sepultado;
        }
        
        setSeps(sepultadosArray);

        if (sepultadosArray.length === 0) {
            console.warn("Aviso: Nenhum sepultado encontrado na resposta da API ou formato desconhecido.", response.data);
        }
        
        // --- FIM DO CÓDIGO DE DEPURAÇÃO ---

    }).catch((error) => {
        console.error('Erro ao buscar dados da API:', error);
        setSeps([]);
    })
}, [])









    const handleImageClick = (imageUrl) => {
        // Só expande se a URL não for a da imagem padrão
        if (imageUrl && !imageUrl.includes('/sep.png')) {
            setExpandedImage(imageUrl)
        }
    }

    const handleCloseModal = () => {
        setExpandedImage(null)
    }

    return (
        <section>
            <div className={styles.sepultado_home_header}>
                <h5>Recentes</h5>
            </div>
            <div className={styles.sepultado_container}>
                {seps.length > 0 && 
                    seps.map((sepultado) => {
                        // --- INÍCIO DA LÓGICA DE IMAGEM ROBUSTA ---
                        const API = (process.env.REACT_APP_API || '').replace(/\/+$/, '');
                        const raw = sepultado?.images?.[0];
                        const cleaned = typeof raw === 'string' ? raw.trim() : '';
                        const isBad = !cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === '/';
                        
                        const srcImg = !isBad
                          ? `${API}/images/sepultados/${cleaned}`
                          : '/sep.png';
                        // --- FIM DA LÓGICA ---

                        return (
                            <div key={sepultado._id} className={styles.sepultado_card}>
                                
                                {/* VOLTAMOS A USAR A SUA DIV ORIGINAL, MAS COM A URL SEGURA */}
                                <div  
                                    style={{backgroundImage: `url(${srcImg})`}}
                                    className={styles.sepultado_card_image}
                                    onClick={() => handleImageClick(srcImg)}
                                >
                                </div>

                                <h3>{sepultado.nome}</h3>
                                <h4>Informações da sepultura</h4>
                                <p>
                                    <span className='bold'>Rua: </span>{sepultado.rua || "Inform. desconhecida"}
                                </p>
                                <p>
                                    <span className='bold'>Quadra: </span>{sepultado.quadra || "Inform. desconhecida"}
                                </p>
                                <p>
                                    <span className='bold'>Placa: </span>{sepultado.chapa || "Inform. desconhecida"}
                                </p>
                                <Link to={`sepultados/${sepultado._id}`}>Mais detalhes</Link>
                            </div>  
                        )
                    })
                }
                {seps.length === 0 && (
                    <p>Não há sepultados cadastrados no momento</p>
                )}
            </div>

            {/* O modal continua funcionando como antes */}
            {expandedImage && (
                <div className={styles.image_modal} onClick={handleCloseModal}>
                    <div className={styles.modal_content} onClick={(e) => e.stopPropagation()}>
                        <img 
                            src={expandedImage} 
                            alt="Imagem expandida" 
                            className={styles.expanded_image}
                            onClick={handleCloseModal}
                        />
                        <button 
                            className={styles.close_button}
                            onClick={handleCloseModal}
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}
        </section>
    )
}

export default Home
