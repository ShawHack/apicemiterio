// Importa o módulo 'express', que é um framework para aplicações web em Node.js
const express = require('express');

// Importa o módulo 'cors' para permitir requisições de origens diferentes (Cross-Origin Resource Sharing)
const cors = require('cors');

// Cria uma instância da aplicação Express
const app = express();

// Configura o middleware para que a aplicação aceite requisições com corpo em formato JSON
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// Configura o middleware CORS para aceitar requisições da origem 'http://localhost:3000'
// Também permite envio de cookies e headers de autenticação (credentials: true)
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));

// Define a pasta 'public' como pública para servir arquivos estáticos (ex: imagens)
app.use(express.static('public'));


// Importa as rotas relacionadas ao usuário do arquivo 'UserRoutes.js'
const UserRoutes = require('./routes/UserRoutes');

const SepultadoRoutes = require('./routes/SepultadoRoutes')

// Usa as rotas importadas a partir do caminho '/users'
app.use('/users', UserRoutes);
app.use('/sepultados', SepultadoRoutes);

// Inicia o servidor na porta 5000 e imprime uma mensagem no console ao iniciar
app.listen(5000, () => {
  console.log('Servidor rodando na porta 5000');


  app.use((err, req, res, next) => {
  console.error('[ERR]', err); // <— veja aqui a causa/stack
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'Erro interno do servidor' });
});

});
