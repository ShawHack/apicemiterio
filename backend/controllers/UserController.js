const User = require('../models/User'); // Importa o model User do Mongoose
const bcrypt = require('bcrypt'); // Biblioteca para hashing de senha
const jwt = require('jsonwebtoken'); // Biblioteca para manipular JSON Web Tokens (JWT)
const mongoose = require('mongoose'); // Biblioteca para manipulação do MongoDB e validação de ObjectId

// helpers
const createUserToken = require('../helpers/create-user-token'); // Função auxiliar para criar e enviar token ao usuário
const getToken = require('../helpers/get-token-js'); 
const getUserByToken = require('../helpers/get-user-by-token');// Função auxiliar para extrair token do cabeçalho da requisição


module.exports = class UserController {

  //////////////////////////////////// Método para registrar um novo usuário///////////////////////////////////////////////////////////////
  static async register(req, res) {
    const { name,cpf, email, phone, password, confirmpassword } = req.body; // Desestrutura dados enviados pelo cliente

    // Verifica se o corpo da requisição existe
    if (!req.body) {
      return res.status(400).json({ message: "Corpo da requisição não enviado." });
    }

    // Validações dos campos obrigatórios
    if (!name) return res.status(422).json({ message: 'O nome é obrigatório' });
     if (!cpf) return res.status(422).json({ message: 'O CPF é obrigatório' });
    if (!email) return res.status(422).json({ message: 'O email é obrigatório' });
    if (!phone) return res.status(422).json({ message: 'O phone é obrigatório' });
    if (!password) return res.status(422).json({ message: 'A senha é obrigatória' });
    if (!confirmpassword) return res.status(422).json({ message: 'A confirmação de senha é obrigatória' });

    // Verifica se as senhas conferem
    if (password !== confirmpassword) {
      return res.status(422).json({ message: 'As senhas não conferem' });
    }

    // Verifica se o e-mail já está cadastrado no banco
    const userExists = await User.findOne({ email: email });
    if (userExists) {
      return res.status(422).json({ message: 'E-mail em uso, digite outro e-mail' });
    }

    // Gera um salt para a senha e cria o hash da senha
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Cria um novo objeto User com os dados e a senha criptografada
    const user = new User({
      name: name,
      cpf: cpf,
      email: email,
      phone: phone,
      password: passwordHash
    });

    try {
      // Salva o novo usuário no banco de dados
      const newUser = await user.save();
      // Cria o token e envia a resposta ao cliente
      await createUserToken(newUser, req, res);
    } catch (error) {
      // Em caso de erro no servidor, envia status 500 com a mensagem de erro
      res.status(500).json({ message: error });
    }
  }



  ///////////////////////////// Método para login do usuário/////////////////////////////////////////
  static async login(req, res) {
    // Verifica se o corpo da requisição está presente e não está vazio
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: 'Corpo da requisição ausente!' });
    }

    const { email, password } = req.body;

    // Validações dos campos obrigatórios
    if (!email) {
      return res.status(422).json({ message: 'O e-mail é obrigatório' });
    }
    if (!password) {
      return res.status(422).json({ message: 'A senha é obrigatória' });
    }

    // Procura o usuário no banco pelo e-mail
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(422).json({ message: 'Não há usuário cadastrado com este e-mail' });
    }

    // Compara a senha informada com a senha armazenada no banco (hash)
    const checkPassword = await bcrypt.compare(password, user.password);
    if (!checkPassword) {
      return res.status(422).json({ message: 'A senha é inválida!' });
    }

    // Se estiver tudo certo, cria e envia o token para o cliente
    await createUserToken(user, req, res);


  }

  //////////////////////// Método para verificar o usuário logado a partir do token////////////////////////////////////////////
  static async checkUser(req, res) {
    let currentUser;

    // Verifica se o cabeçalho Authorization existe
    if (req.headers.authorization) {
      // Extrai o token do cabeçalho Authorization
      const token = getToken(req);

      // Se o token não existir ou estiver mal formatado, retorna erro 401 (não autorizado)
      if (!token) {
        return res.status(401).json({ message: 'Token inválido ou mal formatado' });
      }

      // Decodifica o token usando a chave secreta
      const decoded = jwt.verify(token, 'nossosecret');

      // Busca o usuário no banco pelo ID obtido no token
      currentUser = await User.findById(decoded.id);

      // Remove a senha da resposta para segurança
      currentUser.password = undefined;

    } else {
      // Se não existir token, currentUser fica nulo
      currentUser = null;
    }

    // Envia o usuário atual (ou nulo) na resposta
    res.status(200).send(currentUser);
  }

  ////////////////////BUSCAR USUÁRIO PELO ID /////////////////////////////////////////////////////////////////

  // Método para buscar um usuário pelo ID (parâmetro da URL)
  static async getUserById(req, res) {
    const id = req.params.id; // Pega o ID da URL

    // Valida se o ID tem formato válido de ObjectId do MongoDB
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(422).json({ message: 'ID inválido' });
    }

    try {
      // Busca o usuário pelo ID no banco
      const user = await User.findById(id).select('-password');

      // Se não achar, retorna erro 404 (não encontrado)
      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado!' });
      }

      // Se achar, retorna o usuário com status 200
      res.status(200).json({ user });
    } catch (err) {
      // Em caso de erro no servidor, retorna erro 500 com a mensagem
      res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
  }


  ///////////////////////EDITAR USUÁRIO//////////////////////////////////////////////////////////////////////


static async editUser(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(422).json({ message: 'ID inválido' });
    }

    const token = getToken(req);
    const requester = await getUserByToken(token);
    if (!requester) return res.status(401).json({ message: 'Não autenticado' });

    const isSelf = String(requester._id) === String(id);
    const isAdmin = requester.role === 'admin';
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Somente o próprio usuário ou admin pode editar' });
    }

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ message: 'Usuário não encontrado!' });

    // Campos permitidos (role/senha ficam fora daqui)
    const ALLOWED = ['name', 'email', 'phone'];
    const update = {};

    if (req.file) update.image = req.file.filename;

    for (const key of ALLOWED) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        update[key] = req.body[key];
      }
    }

    if (!update.name && !update.email && !update.phone && !update.image) {
      return res.status(422).json({ message: 'Nada para atualizar.' });
    }
    if (update.name !== undefined && !String(update.name).trim()) {
      return res.status(422).json({ message: 'O nome é obrigatório' });
    }
    if (update.email !== undefined && !String(update.email).trim()) {
      return res.status(422).json({ message: 'O email é obrigatório' });
    }

    // Unicidade de e-mail (compare com o e-mail do ALVO, não do admin)
    if (update.email && update.email !== target.email) {
      const emailEmUso = await User.findOne({ email: update.email, _id: { $ne: id } });
      if (emailEmUso) return res.status(422).json({ message: 'E-mail já em uso por outro usuário' });
    }

    // Garante que estes campos não mudam por aqui
    delete req.body?.password;
    delete req.body?.cpf;
    delete req.body?.confirmpassword;
    delete req.body?.role;

    const saved = await User.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true, projection: { password: 0 } }
    );

    return res.status(200).json({
      message: 'Usuário atualizado com sucesso!',
      user: saved,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao atualizar usuário', error: error.message });
  }
}




// controllers/UserController.js
static async listConcessionarios(req, res) {
  try {
    const users = await User.find({ role: 'concessionario' }).select('_id name email')
    res.json(users)
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar concessionários' })
  }
}




// controllers/UserController.js
static async adminCreateUser(req, res) {
  try {
    const token = getToken(req);
    const admin = await getUserByToken(token);
    if (!admin) return res.status(401).json({ message: 'Não autenticado' });
    if (admin.role !== 'admin') return res.status(403).json({ message: 'Somente admin pode criar usuários' });

    // 👇 incluir cpf e validar
    const { name, cpf, email, phone, role = 'usuario', password, confirmpassword } = req.body || {};
    if (!name) return res.status(422).json({ message: 'O nome é obrigatório' });
    if (!cpf) return res.status(422).json({ message: 'O CPF é obrigatório' });
    if (!email) return res.status(422).json({ message: 'O email é obrigatório' });
    if (!phone) return res.status(422).json({ message: 'O phone é obrigatório' });
    if (!password) return res.status(422).json({ message: 'A senha é obrigatória' });
    if (!confirmpassword) return res.status(422).json({ message: 'A confirmação de senha é obrigatória' });
    if (password !== confirmpassword) return res.status(422).json({ message: 'As senhas não conferem' });

    // unicidade (email e, se quiser, cpf)
    const existsEmail = await User.findOne({ email });
    if (existsEmail) return res.status(422).json({ message: 'E-mail em uso' });

    const existsCpf = await User.findOne({ cpf });
    if (existsCpf) return res.status(422).json({ message: 'CPF já cadastrado' });

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      cpf,              // 👈 salvar cpf
      email,
      phone,
      password: passwordHash,
      role,
    });

    if (req.file) user.image = req.file.filename;

    const created = await user.save();
    return res.status(201).json({
      message: 'Usuário criado com sucesso!',
      user: {
        _id: created._id,
        name: created.name,
        cpf: created.cpf,
        email: created.email,
        role: created.role,
        phone: created.phone,
        image: created.image,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao criar usuário', error: err.message });
  }
}












// controllers/UserController.js  (adicione dentro da classe)

static async list(req, res) {
  try {
    // auth
    const token = getToken(req);
    const u = await getUserByToken(token);
    if (!u) return res.status(401).json({ message: 'Não autenticado' });
    if (u.role !== 'admin') return res.status(403).json({ message: 'Somente admin pode listar usuários' });

    const q = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const filter = q
      ? { $or: [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }] }
      : {};

    const [users, total] = await Promise.all([
      User.find(filter).select('_id name email role image phone createdAt').sort('-createdAt').skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({ users, page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao listar usuários', error: err.message });
  }
}

static async remove(req, res) {
  try {
    const id = req.params.id;

    const token = getToken(req);
    const u = await getUserByToken(token);
    if (!u) return res.status(401).json({ message: 'Não autenticado' });
    if (u.role !== 'admin') return res.status(403).json({ message: 'Somente admin pode excluir usuários' });

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(422).json({ message: 'ID inválido' });
    if (String(u._id) === String(id)) return res.status(422).json({ message: 'Você não pode excluir a si mesmo' });

    const exists = await User.findById(id);
    if (!exists) return res.status(404).json({ message: 'Usuário não encontrado' });

    await User.findByIdAndDelete(id);
    res.status(200).json({ message: 'Usuário excluído com sucesso!' });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao excluir usuário', error: err.message });
  }
}

static async adminCreateUser(req, res) {
  try {
    const token = getToken(req);
    const admin = await getUserByToken(token);
    if (!admin) return res.status(401).json({ message: 'Não autenticado' });
    if (admin.role !== 'admin') return res.status(403).json({ message: 'Somente admin pode criar usuários' });

    const { name, email, phone, role = 'usuario', password, confirmpassword } = req.body || {};
    if (!name) return res.status(422).json({ message: 'O nome é obrigatório' });
    if (!email) return res.status(422).json({ message: 'O email é obrigatório' });
    if (!phone) return res.status(422).json({ message: 'O phone é obrigatório' });
    if (!password) return res.status(422).json({ message: 'A senha é obrigatória' });
    if (!confirmpassword) return res.status(422).json({ message: 'A confirmação de senha é obrigatória' });
    if (password !== confirmpassword) return res.status(422).json({ message: 'As senhas não conferem' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(422).json({ message: 'E-mail em uso' });

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name, email, phone, password: passwordHash, role
    });

    if (req.file) user.image = req.file.filename;

    const created = await user.save();
    // IMPORTANTE: não loga o usuário criado. Retorna dados básicos
    res.status(201).json({
      message: 'Usuário criado com sucesso!',
      user: { _id: created._id, name: created.name, email: created.email, role: created.role, phone: created.phone, image: created.image }
    });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao criar usuário', error: err.message });
  }
}

// Dentro da classe UserController
static async setRole(req, res) {
  try {
    const id = req.params.id;
    const { role } = req.body || {};

    const token = getToken(req);
    const admin = await getUserByToken(token);
    if (!admin) return res.status(401).json({ message: 'Não autenticado' });
    if (admin.role !== 'admin') return res.status(403).json({ message: 'Somente admin pode alterar papéis' });

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(422).json({ message: 'ID inválido' });
    }

    const ALLOWED = ['usuario', 'concessionario', 'admin'];
    if (!ALLOWED.includes(role)) {
      return res.status(422).json({ message: 'Papel inválido. Use usuario, concessionario ou admin.' });
    }

    // Evita o admin se despromover acidentalmente e perder acesso
    if (String(admin._id) === String(id) && role !== 'admin') {
      return res.status(422).json({ message: 'Você não pode remover seu próprio papel de admin.' });
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: { role } },
      { new: true, projection: { password: 0 }, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Usuário não encontrado' });

    return res.status(200).json({
      message: 'Papel atualizado com sucesso!',
      user: updated
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao atualizar papel', error: err.message });
  }
}



}