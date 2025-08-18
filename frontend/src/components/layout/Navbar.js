import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Logo from '../../assets/img/logo-cemi.png';
import styles from './Navbar.module.css';
import { Context } from '../../context/UserContext';
import api from '../../utils/api';
import useRole from '../../hooks/useRole.js';

function Navbar() {
  const { authenticated, logout } = useContext(Context);

  // Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);

  // Roteamento
  const navigate = useNavigate();
  const location = useLocation();

  // Papel/token centralizados
  const { roleLoaded, token, isAdmin, isConcessionario } = useRole();

  // Regras da busca
  const hiddenSearchRoutes = ['/login', '/register', '/sepultados/add'];
  const isEditRoute = location.pathname.includes('/sepultados/edit/');
  const shouldShowSearch = authenticated && !hiddenSearchRoutes.includes(location.pathname) && !isEditRoute;

  // Debounce da busca
  useEffect(() => {
    if (!shouldShowSearch) return;
    const t = setTimeout(() => {
      if (searchTerm.trim().length >= 2) fetchSuggestions(searchTerm);
      else { setSuggestions([]); setShowSuggestions(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, shouldShowSearch]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Busca sugestões (token para filtrar no backend por papel)
  const fetchSuggestions = async (term) => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const { data } = await api.get(
        `/sepultados/pesquisa?q=${encodeURIComponent(term)}&suggestions=true`,
        { headers }
      );
      setSuggestions(data.sepultado || []);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/sepultados/pesquisa?q=${encodeURIComponent(searchTerm.trim())}`);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (sep) => {
    navigate(`/sepultados/${sep._id}`);
    setSearchTerm(''); setShowSuggestions(false);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbar_logo}>
        <img src={Logo} alt="Cemiterio" />
        <h1>Cemitério Santa Faustina</h1>
      </div>

      {shouldShowSearch && (
        <div className={styles.search_container} ref={searchRef}>
          <form onSubmit={handleSearch} className={styles.search_form}>
            <input
              type="text"
              placeholder="Pesquisar sepultados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.search_input}
              onKeyDown={(e) => e.key === 'Escape' && setShowSuggestions(false)}
            />
            <button type="submit" className={styles.search_button} disabled={!searchTerm.trim()}>
              🔍
            </button>
          </form>

          {showSuggestions && (
            <div className={styles.suggestions_dropdown}>
              {loading && <div className={styles.suggestion_item}><span>Pesquisando...</span></div>}
              {!loading && suggestions.length > 0 && (
                <>
                  {suggestions.map((s, i) => (
                    <div key={s._id || i} className={styles.suggestion_item} onClick={() => handleSuggestionClick(s)}>
                      <div className={styles.suggestion_content}>
                        <strong>{s.nome}</strong><br/>
                        {s.rua && <span> Rua: {s.rua}</span>}
                        {s.quadra && <span>, Quadra: {s.quadra}</span>}
                        {s.chapa && <span>, Placa: {s.chapa}</span>}
                      </div>
                    </div>
                  ))}
                  {searchTerm.trim() && (
                    <div className={styles.suggestion_item_all} onClick={handleSearch}>
                      Ver todos os resultados para "{searchTerm}"
                    </div>
                  )}
                </>
              )}
              {!loading && suggestions.length === 0 && searchTerm.trim().length >= 2 && (
                <div className={styles.suggestion_item}><span>Nenhuma sugestão encontrada</span></div>
              )}
            </div>
          )}
        </div>
      )}

      <ul>
        <li><Link to="/">Home</Link></li>

        {authenticated ? (
          <>
            {/* Só renderiza após confirmar (ou assumir) o papel */}
            {roleLoaded && (isAdmin || isConcessionario) && (
              <li><Link to="/sepultados/meumemorial">Memorial Familiar</Link></li>
            )}
            {roleLoaded && isAdmin && (
              <li><Link to="/meuusuario">Meus Usuários</Link></li>
            )}
            <li><Link to="/user/profile">Perfil</Link></li>
            <li onClick={logout}>Sair</li>
          </>
        ) : (
          <>
            <li><Link to="/login">Entrar</Link></li>
            <li><Link to="/register">Cadastre-se</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
