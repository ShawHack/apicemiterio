// src/components/pages/SearchResults.js
import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../../../utils/api';
import styles from './SearchResults.module.css';

function SearchResults() {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalResults, setTotalResults] = useState(0);
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const searchTerm = searchParams.get('q') || '';

  useEffect(() => {
    const performSearch = async (term) => {
      if (!term || term.trim() === '') {
        setSearchResults([]);
        setTotalResults(0);
        return;
      }

      setLoading(true);
      setError('');
      
      try {
        const response = await api.get('/sepultados/pesquisa?q=' + encodeURIComponent(term.trim()) + '&limit=50');
        
        // Vamos usar a mesma lógica de adivinhação que funcionou na Home
        let sepultadosArray = [];
        if (Array.isArray(response.data)) {
            sepultadosArray = response.data;
        } else if (Array.isArray(response.data.sepultados)) {
            sepultadosArray = response.data.sepultados;
        } else if (Array.isArray(response.data.sepultado)) {
            sepultadosArray = response.data.sepultado;
        }

        setSearchResults(sepultadosArray);
        // Se a API não retornar um total, usamos o tamanho do array como fallback
        setTotalResults(response.data.total || sepultadosArray.length);

        if (sepultadosArray.length === 0) {
            console.log('A busca foi bem-sucedida, mas não retornou resultados.');
        }

      } catch (error) {
        console.error('Erro na chamada da API:', error);
        const errorMsg = error?.response?.data?.message || 'Ocorreu um erro inesperado ao realizar a pesquisa.';
        setError(errorMsg);
        setSearchResults([]);
        setTotalResults(0);
      } finally {
        setLoading(false);
      }
    };

    if (searchTerm && searchTerm.trim() !== '') {
      performSearch(searchTerm);
    } else {
      setSearchResults([]);
      setTotalResults(0);
      setError('');
    }
  }, [searchTerm]);

  const highlightSearchTerm = (text, term) => {
    if (!text || !term) return text;
    
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const index = lowerText.indexOf(lowerTerm);
    
    if (index === -1) return text;
    
    const beforeMatch = text.substring(0, index);
    const match = text.substring(index, index + term.length);
    const afterMatch = text.substring(index + term.length);
    
    return (
      <span>
        {beforeMatch}
        <mark style={{ backgroundColor: '#fff3cd', padding: '2px 4px', borderRadius: '3px' }}>
          {match}
        </mark>
        {afterMatch}
      </span>
    );
  };

  return (
    <section className={styles.search_results_container}>
      <div className={styles.search_header}>
        <h2>Resultados da Pesquisa</h2>
        {searchTerm && (
          <p className={styles.search_term}>
            Pesquisando por: "<strong>{searchTerm}</strong>"
          </p>
        )}
      </div>

      {loading && <div className={styles.loading}><p>Pesquisando...</p></div>}
      {error && <div className={styles.error}><p>{error}</p></div>}

      {!loading && !error && searchTerm && (
        <>
          <div className={styles.results_count}>
            <p>
              {totalResults > 0
                ? `${totalResults} resultado${totalResults !== 1 ? 's' : ''} encontrado${totalResults !== 1 ? 's' : ''}`
                : 'Nenhum resultado encontrado'}
            </p>
          </div>

          <div className={styles.sepultado_container}>
            {searchResults.length > 0 ? (
              searchResults.map((sepultado) => {
                // --- INÍCIO DA LÓGICA DE IMAGEM PADRONIZADA ---
                const API = (process.env.REACT_APP_API || '').replace(/\/+$/, '');
                const raw = sepultado?.images?.[0];
                const cleaned = typeof raw === 'string' ? raw.trim() : '';
                const isBad = !cleaned || cleaned === 'null' || cleaned === 'undefined' || cleaned === '/';
                
                const srcImg = !isBad
                  ? `${API}/images/sepultados/${cleaned}`
                  : '/sepultura-padrao.png';
                // --- FIM DA LÓGICA ---

                return (
                  <div key={sepultado._id} className={styles.sepultado_card}>
                    <div 
                      className={styles.sepultado_card_image}
                      style={{ backgroundImage: `url(${srcImg})` }}
                    >
                    </div>

                    <h3>{highlightSearchTerm(sepultado.nome, searchTerm)}</h3>
                    
                    <h4>Informações da sepultura</h4>
                    <p>
                      <span className="bold">Rua: </span>
                      {sepultado.rua ? highlightSearchTerm(sepultado.rua, searchTerm) : "Inform. desconhecida"}
                    </p>
                    <p>
                      <span className="bold">Quadra: </span>
                      {sepultado.quadra ? highlightSearchTerm(sepultado.quadra, searchTerm) : "Inform. desconhecida"}
                    </p>
                    <p>
                      <span className="bold">Placa: </span>
                      {sepultado.chapa ? highlightSearchTerm(sepultado.chapa, searchTerm) : "Inform. desconhecida"}
                    </p>

                    <Link to={'/sepultados/' + sepultado._id}>Mais detalhes</Link>
                  </div>
                )
              })
            ) : (
              searchTerm && (
                <div className={styles.no_results}>
                  <p>Nenhum sepultado encontrado para "{searchTerm}"</p>
                  <p>Tente pesquisar por:</p>
                  <ul>
                    <li>Nome completo ou parte do nome</li>
                    <li>Rua da sepultura</li>
                    <li>Quadra</li>
                    <li>Número da placa</li>
                  </ul>
                </div>
              )
            )}
          </div>
        </>
      )}

      {!searchTerm && !loading && (
        <div className={styles.no_results}>
          <p>Digite algo na barra de pesquisa para encontrar sepultados.</p>
        </div>
      )}
    </section>
  );
}

export default SearchResults;
