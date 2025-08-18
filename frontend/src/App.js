import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

/* pages */
import Login from './components/pages/Auth/Login';
import Register from './components/pages/Auth/Register';
import Home from './components/pages/Home';
import Profile from './components/pages/User/Profile';
import MeusSepultados from './components/pages/Sepultado/MeusSepultados';
import AddSepultado from './components/pages/Sepultado/addSepultado';
import EditSepultado from './components/pages/Sepultado/EditSepultado';
import SepultadoDetails from './components/pages/Sepultado/SepultadosDetails';
import SearchResults from './components/pages/Sepultado/SearchResults';

/* usuários */
import MeusUsuarios from './components/pages/User/MeusUsuarios';
import AddUsuario from './components/pages/User/AddUsuario';
import EditUsuario from './components/pages/User/EditUsuario';

/* layout */
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Container from './components/layout/Container';
import Message from './components/layout/Message';

/* guards */
import RequireAuth from './components/pages/Auth/RequireAuth';
import RoleGate from './components/pages/Auth/RoleGate';

/* context */
import { Userprovider } from './context/UserContext';

function App() {
  return (
    <Router>
      <Userprovider>
        <Navbar />
        <Message />
        <Container>
          <Routes>
            {/* Públicas */}
          <Route path="/"element={ <RequireAuth>  <Home /></RequireAuth>}/>
             <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/sepultados/pesquisa" element={<SearchResults />} />
            <Route path="/sepultados/:id" element={<SepultadoDetails />} />

            {/* Autenticadas (qualquer papel) */}
            <Route
              path="/user/profile"
              element={
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              }
            />

            {/* Admin & Concessionário (backend filtra os atribuídos para concessionário) */}
            <Route
              path="/sepultados/meumemorial"
              element={
                <RequireAuth>
                  <RoleGate allow={['admin', 'concessionario']}>
                    <MeusSepultados />
                  </RoleGate>
                </RequireAuth>
              }
            />
            <Route
              path="/sepultados/edit/:id"
              element={
                <RequireAuth>
                  <RoleGate allow={['admin', 'concessionario']}>
                    <EditSepultado />
                  </RoleGate>
                </RequireAuth>
              }
            />

            {/* Somente admin */}
            <Route
              path="/sepultados/add"
              element={
                <RequireAuth>
                  <RoleGate allow={['admin']}>
                    <AddSepultado />
                  </RoleGate>
                </RequireAuth>
              }
            />
            <Route
              path="/meuusuario"
              element={
                <RequireAuth>
                  <RoleGate allow={['admin']}>
                    <MeusUsuarios />
                  </RoleGate>
                </RequireAuth>
              }
            />
            <Route
              path="/usuarios/add"
              element={
                <RequireAuth>
                  <RoleGate allow={['admin']}>
                    <AddUsuario />
                  </RoleGate>
                </RequireAuth>
              }
            />
            <Route
              path="/usuarios/edit/:id"
              element={
                <RequireAuth>
                  <RoleGate allow={['admin']}>
                    <EditUsuario />
                  </RoleGate>
                </RequireAuth>
              }
            />
          </Routes>
        </Container>
        <Footer />
      </Userprovider>
    </Router>
  );
}

export default App;
