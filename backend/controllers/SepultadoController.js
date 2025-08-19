const Sepultado = require("../models/Sepultado") // Importa o model Mongoose do Sepultado
const mongoose = require("mongoose") // Importa o mongoose para usar ObjectId e conexões

//helpers
const getToken = require("../helpers/get-token-js") // Função que extrai o token da requisição
const getUserBytoken = require("../helpers/get-user-by-token") // Função que obtém usuário com base no token
const ObjectId = require("mongoose").Types.ObjectId // Atalho para validar ObjectId do MongoDB

// Função auxiliar para remover acentos e caracteres especiais - CORRIGIDA
const removeAccents = (str) => {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacríticos
    .toLowerCase()
    .trim();
};

module.exports = class SepultadoController {
  // Método para criar um novo sepultado (somente admin)
static async createSepultado(req, res) {
  try {
    // Auth
    const token = getToken(req);
    const user = await getUserBytoken(token);
    if (!user) return res.status(401).json({ message: "Não autenticado" });

    // Regra: somente admin cria
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Somente admin pode criar sepultados" });
    }

    // Valida body
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(422).json({ message: "Nenhum dado foi enviado. Por favor, preencha o formulário." });
    }

    const {
      id, cemiterio, chapa, dtFal, dtNasc, idade, mae, nacionalidade, nome, pai,
      quadra, rua, epitafio, tipoSepultura, latitude, longitude, concessionarios
    } = req.body;

    // Valida obrigatórios (mantive sua regra)
    const obrig = { nome, chapa, dtFal, dtNasc, idade, quadra, mae, pai };
    for (const [k, v] of Object.entries(obrig)) {
      if (!v) return res.status(422).json({ message: `O campo ${k} é obrigatório!` });
    }

    // Imagens (multer)
    const files = req.files?.images || [];
    const images = Array.isArray(files) ? files.map(f => f.filename) : [];

    const sepultado = new Sepultado({
      id, cemiterio, nome, chapa, dtFal, dtNasc, idade, quadra, mae, pai,
      nacionalidade, latitude, longitude, rua, epitafio, tipoSepultura,
      available: true,
      images,
      // criador/registrador (mantendo sua estrutura atual)
      user: { _id: user._id, name: user.name, image: user.image, phone: user.phone },
      // admin pode atribuir concessionários já na criação (array de ObjectIds ou vazio)
      concessionarios: Array.isArray(concessionarios) ? concessionarios : (concessionarios ? [concessionarios] : [])
    });

    const newSepultado = await sepultado.save();
    return res.status(201).json({ message: "Sepultado cadastrado com sucesso!", newSepultado });
  } catch (error) {
    console.error("Erro ao criar sepultado:", error);
    return res.status(500).json({ message: error.message });
  }
}




















    // Retorna os últimos 20 sepultados cadastrados (ordenados do mais recente ao mais antigo)
    static async getAll(req, res) {
        try {
            const sepultado = await Sepultado.find()
                .sort("-createdAt") // Ordena por data de criação, do mais novo ao mais antigo
                .limit(20);         // Limita a 20 registros

            res.status(200).json({ sepultado });
        } catch (error) {
            res.status(500).json({ message: "Erro ao buscar os sepultados", error: error.message });
        }
    }

// GET /sepultados/:id/comentarios?page=1&limit=20
static async listarComentarios(req, res) {
  try {
    const { id } = req.params
    const page = Math.max(1, parseInt(req.query.page || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)))

    let sep = null
    if (mongoose.Types.ObjectId.isValid(id)) sep = await Sepultado.findById(id).select('comentarios')
    if (!sep) sep = await Sepultado.findOne({ id }).select('comentarios')
    if (!sep) return res.status(404).json({ message: 'Sepultado não encontrado.' })

    const ordenados = [...(sep.comentarios || [])].sort(
      (a, b) => new Date(b.createdAt || b.data || 0) - new Date(a.createdAt || a.data || 0)
    )
    const total = ordenados.length
    const start = (page - 1) * limit
    const items = ordenados.slice(start, start + limit)

    // seu front já lida com ambos os formatos; vamos enviar objeto
    return res.status(200).json({
      items,
      total,
      page,
      limit,
      hasMore: start + items.length < total
    })
  } catch (error) {
    console.error('Erro ao listar comentários:', error)
    return res.status(500).json({ message: 'Erro ao listar comentários.' })
  }
}

// POST /sepultados/:id/comentarios
static async adicionarComentario(req, res) {
  const { id } = req.params
  const { comentario, autor } = req.body

  if (!comentario || !String(comentario).trim()) {
    return res.status(422).json({ message: 'Comentário é obrigatório.' })
  }

  try {
    if (!req.user?._id) return res.status(401).json({ message: 'Não autenticado' })

    let sep = null
    if (mongoose.Types.ObjectId.isValid(id)) sep = await Sepultado.findById(id)
    if (!sep) sep = await Sepultado.findOne({ id })
    if (!sep) return res.status(404).json({ message: 'Sepultado não encontrado.' })

    const novo = {
      texto: String(comentario).trim(),
      autor: (autor && String(autor).trim()) || req.user.name || 'Anônimo',
      user: req.user._id,
      createdAt: new Date(),
    }

    sep.comentarios.push(novo)
    await sep.save()

    const inserido = sep.comentarios[sep.comentarios.length - 1]
    return res.status(201).json(inserido)
  } catch (error) {
    console.error('Erro ao adicionar comentário:', error)
    return res.status(500).json({ message: 'Erro ao adicionar comentário.' })
  }
}

// DELETE /sepultados/:id/comentarios/:cid
static async removerComentario(req, res) {
  try {
    const { id, cid } = req.params
    if (!req.user?._id) return res.status(401).json({ message: 'Não autenticado' })

    let sep = null
    if (mongoose.Types.ObjectId.isValid(id)) sep = await Sepultado.findById(id)
    if (!sep) sep = await Sepultado.findOne({ id })
    if (!sep) return res.status(404).json({ message: 'Sepultado não encontrado.' })

    const c = sep.comentarios.id(cid)
    if (!c) return res.status(404).json({ message: 'Comentário não encontrado.' })

    const isOwner = String(c.user) === String(req.user._id)
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Sem permissão para remover este comentário.' })
    }

    c.deleteOne() // remove subdoc
    await sep.save()
    return res.status(200).json({ message: 'Comentário removido.' })
  } catch (error) {
    console.error('Erro ao remover comentário:', error)
    return res.status(500).json({ message: 'Erro ao remover comentário.' })
  }
}





static async getAllUserSepultados(req, res) {
  try {
    const token = getToken(req);
    const user = await getUserBytoken(token);
    if (!user) return res.status(401).json({ message: 'Não autenticado' });

    // parâmetros
    const q = (req.query.q || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10))); // cap em 50
    const skip = (page - 1) * limit;

    // filtro base por papel
    const role = (user.role || '').toString().trim().toLowerCase();
    const userId = user._id;
    let baseQuery = {};

    if (role === 'admin') {
      baseQuery = {}; // vê todos
    } else if (role === 'concessionario') {
      baseQuery = { $or: [{ 'user._id': userId }, { concessionarios: userId }] };
    } else {
      baseQuery = { 'user._id': userId };
    }

    // filtro de busca (admin encontra rápido o alvo para editar)
    // busca por nome, rua, quadra, chapa
    let searchQuery = {};
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); // escape + case-insensitive
      searchQuery = { $or: [{ nome: regex }, { rua: regex }, { quadra: regex }, { chapa: regex }] };
    }

    const query = Object.keys(searchQuery).length ? { $and: [baseQuery, searchQuery] } : baseQuery;

    const [sepults, total] = await Promise.all([
      Sepultado.find(query).sort('-createdAt').skip(skip).limit(limit).lean(),
      Sepultado.countDocuments(query),
    ]);

    return res.status(200).json({
      sepults,
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      q,
    });
  } catch (error) {
    console.error('[meussepultados] erro:', error);
    return res.status(500).json({ message: error.message });
  }
}











    // Endpoint opcional — parece ser um esboço para futuras funcionalidades
    static async getAllInformacoes(req,res){
        try {
            const token = getToken(req)
            const user = await getUserBytoken(token)

            // const sepults =await Sepultado.find({"solicitante._id": user._id}).sort("-createdAt") // comentado

            res.status(200).json({
                sepults: [], // Array vazio por enquanto
            })
        } catch (error) {
            res.status(500).json({ message: error.message })
        }
    }

    // Busca um sepultado por ID (ObjectId ou UUID alternativo)
    static async getSepById(req, res) {
        const id = req.params.id;
        let sepultado = null;

        try {
            // Primeiro tenta buscar usando o ObjectId padrão do MongoDB
            if (mongoose.Types.ObjectId.isValid(id)) {
                sepultado = await Sepultado.findOne({ _id: id });
            }

            // Se não encontrou, tenta buscar por campo 'id' (possivelmente UUID)
            if (!sepultado) {
                sepultado = await Sepultado.findOne({ id: id });
            }

            if (!sepultado) {
                return res.status(404).json({ message: "Sepultado não encontrado." });
            }

            res.status(200).json(sepultado);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Erro ao buscar sepultado." });
        }
    }

    //*****************remover************************************************************************************************************************ */

   // Remove um sepultado por ID (somente admin)
static async removeSepById(req, res) {
  const id = req.params.id;

  try {
    if (!ObjectId.isValid(id)) {
      return res.status(422).json({ message: "ID inválido!" });
    }

    const sepultado = await Sepultado.findById(id);
    if (!sepultado) {
      return res.status(404).json({ message: "Sepultado não encontrado!" });
    }

    const token = getToken(req);
    const user = await getUserBytoken(token);
    if (!user) return res.status(401).json({ message: "Não autenticado" });

    // Regra: somente admin exclui
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Somente admin pode excluir sepultados" });
    }

    await Sepultado.findByIdAndDelete(id);
    return res.status(200).json({ message: "Sepultado removido com sucesso!" });
  } catch (error) {
    console.error("Erro ao remover sepultado:", error);
    return res.status(500).json({ message: error.message });
  }
}


    // *****************************************EDITAR*************************************************************************************************************

    // Editar sepultado: admin (sempre) ou concessionario atribuído
static async updateSep(req, res) {
  const id = req.params.id;

  try {
    if (!ObjectId.isValid(id)) {
      return res.status(422).json({ message: "ID inválido!" });
    }

    const sep = await Sepultado.findById(id).select('concessionarios user');
    if (!sep) return res.status(404).json({ message: "Registro não encontrado!" });

    const token = getToken(req);
    const user = await getUserBytoken(token);
    if (!user) return res.status(401).json({ message: "Não autenticado" });

    const isAdmin = user.role === 'admin';
    const isConcessionario = user.role === 'concessionario';
    const isAtribuido = isConcessionario && (sep.concessionarios || []).some(u => String(u) === String(user._id));

    if (!isAdmin && !isAtribuido) {
      return res.status(403).json({ message: "Sem permissão para editar este registro" });
    }

    // ---- Monta dados atualizáveis ----
    const {
      cemiterio, chapa, dtFal, dtNasc, idade, mae, nacionalidade, nome, pai,
      quadra, rua, epitafio, tipoSepultura, latitude, longitude, available
      // ATENÇÃO: concessionarios e user NÃO entram aqui para concessionário
    } = req.body || {};

    const updatedData = {};

    // Validações obrigatórias (mantive sua regra; se quiser permitir parciais, podemos relaxar)
    const obrig = { nome, chapa, dtFal, dtNasc, idade, quadra, mae, pai };
    for (const [k, v] of Object.entries(obrig)) {
      if (v === undefined || v === null || v === '') {
        return res.status(422).json({ message: `O campo ${k} é obrigatório!` });
      }
      updatedData[k] = v;
    }

    // Campos opcionais
    if (cemiterio !== undefined) updatedData.cemiterio = cemiterio;
    if (rua !== undefined) updatedData.rua = rua;
    if (epitafio !== undefined) updatedData.epitafio = epitafio;
    if (nacionalidade !== undefined) updatedData.nacionalidade = nacionalidade;
    if (tipoSepultura !== undefined) updatedData.tipoSepultura = tipoSepultura;
    if (latitude !== undefined) updatedData.latitude = latitude;
    if (longitude !== undefined) updatedData.longitude = longitude;
    if (available !== undefined) updatedData.available = available;

    // Imagens (multer: imageUpload.array('images'))
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      updatedData.images = files.map(f => f.filename);
    }

    // Concessionário NÃO pode alterar responsáveis nem o subdoc "user"
    if (!isAdmin) {
      delete req.body?.concessionarios;
      delete req.body?.user;
    } else {
      // Admin pode atualizar concessionarios se vierem no body
      if (Array.isArray(req.body?.concessionarios)) {
        updatedData.concessionarios = req.body.concessionarios;
      } else if (req.body?.concessionarios) {
        updatedData.concessionarios = [req.body.concessionarios];
      }
      // Admin pode ajustar o subdoc user se precisar (geralmente não recomendado)
      if (req.body?.user) {
        updatedData.user = req.body.user;
      }
    }

    await Sepultado.findByIdAndUpdate(id, updatedData, { new: true });
    return res.status(200).json({ message: "Registro atualizado com sucesso!" });

  } catch (error) {
    console.error("Erro ao atualizar sepultado:", error);
    return res.status(500).json({ message: error.message });
  }
}


    static async schedule(req,res){
        try {
            const id = req.params.id

            // Verifica que o sepultado existe
            const sepultado = await Sepultado.findOne({_id:id})
            if(!sepultado){
                res.status(404).json({message: "Registro não encontrado!"})
                return
            }

            const token = getToken(req)
            const user = await getUserBytoken(token)

            // Verifica se o sepultado ja esta registrado no usuario
            if(sepultado.user._id.equals(user._id)){
                res.status(422).json({
                message:"Você já é o usuário responsavel por este sepultado"
                })
                return
            }

            // Verifica se há uma outra requisição 
            if(sepultado.adopter){
                if(sepultado.adopter._id.equals(user._id)){
                    res.status(422).json({
                        message: "Você já solicitou a adoção de responsabilidade sobre este sepultado!"
                    })
                    return
                }
            }

            // Adicionando usuario como responsavel do sepultado
            sepultado.adopter = {
                _id: user._id,
                name: user.name,
                image: user.image
            }

            await Sepultado.findByIdAndUpdate(id,sepultado)
            res.status(200).json({
                message: `A visita foi agendada com sucesso, entre em contato com o ${sepultado.cemiterio}, pelo telefone (14) 3471-0233`
            })

        } catch (error) {
            console.error("Erro ao agendar visita:", error);
            res.status(500).json({ message: error.message });
        }
    }

    static async concludeAdoption(req, res) {
        const id = req.params.id;

        try {
            const sepultado = await Sepultado.findOne({ _id: id });

            if (!sepultado) {
                return res.status(404).json({ message: "Sepultado não encontrado" });
            }

            const token = getToken(req);
            const user = await getUserBytoken(token);

            // Verifica se o usuário autenticado é o dono do sepultado
            if (sepultado.user._id.toString() !== user._id.toString()) {
                return res.status(403).json({
                    message: "Acesso negado. Você não tem permissão para concluir esta adoção.",
                });
            }

            sepultado.available = false;

            await Sepultado.findByIdAndUpdate(id, sepultado);

            res.status(200).json({
                message: `Você agora é o responsável pelo sepultado: ${sepultado.nome}`,
            });
        } catch (error) {
            console.error("Erro ao concluir adoção:", error);
            res.status(500).json({ message: "Erro ao concluir a adoção." });
        }
    }

// Substitua o método searchSepultados por esta versão final e correta.

static async searchSepultados(req, res) {
    const { q, limit = 50 } = req.query;

    if (!q || q.trim() === "") {
        return res.status(400).json({ message: "O termo de pesquisa é obrigatório!" });
    }

    try {
        const originalTerm = q.trim();
        const limitNum = parseInt(limit, 10);

        // 1. DIVIDIR O TERMO DE BUSCA EM PALAVRAS-CHAVE
        //    Ex: "jose dos" -> ["jose", "dos"]
        //    Ex: "jose" -> ["jose"]
        const searchWords = originalTerm.split(' ').filter(word => word.length > 0);

        // 2. CONSTRUIR A QUERY DE BUSCA PRINCIPAL
        //    Usamos $and para garantir que o documento contenha TODAS as palavras pesquisadas.
        const matchQuery = {
            $and: searchWords.map(word => {
                // Para cada palavra, criamos uma regex para buscar a versão normalizada (sem acento)
                const normalizedWord = removeAccents(word);
                const regex = new RegExp(normalizedWord, 'i');
                
                // E verificamos se essa palavra existe em QUALQUER um dos campos relevantes ($or)
                return {
                    $or: [
                        { nome: regex },
                        { rua: regex },
                        { quadra: regex },
                        { chapa: regex }
                    ]
                };
            })
        };

        // Expressão regular para verificar se o nome COMEÇA com o termo completo.
        const startsWithRegex = new RegExp(`^${originalTerm}`, "i");

        const pipeline = [
            // ETAPA 1: $match - Filtra documentos que correspondem a TODAS as palavras-chave.
            {
                $match: matchQuery
            },
            // ETAPA 2: $addFields - Adiciona o campo 'score' para relevância.
            {
                $addFields: {
                    score: {
                        $cond: {
                            if: { $regexMatch: { input: "$nome", regex: startsWithRegex } },
                            then: 15, // Pontuação MÁXIMA se o nome começa com o termo
                            else: {
                                $cond: {
                                    // Usamos uma regex simples para ver se o nome contém a frase inteira
                                    if: { $regexMatch: { input: "$nome", regex: new RegExp(removeAccents(originalTerm), 'i') } },
                                    then: 10, // Pontuação MÉDIA se o nome contém o termo
                                    else: 5 // Pontuação MÍNIMA para outros campos
                                }
                            }
                        }
                    }
                }
            },
            // ETAPA 3: $sort - Ordena pela pontuação e depois pelo nome.
            {
                $sort: {
                    score: -1,
                    nome: 1
                }
            },
            // ETAPA 4: $limit - Restringe o número de resultados.
            {
                $limit: limitNum
            },
            // ETAPA 5: $project - Seleciona os campos a serem retornados.
            {
                $project: {
                    _id: 1,
                    nome: 1,
                    rua: 1,
                    quadra: 1,
                    chapa: 1,
                    images: { $slice: ["$images", 1] },
                }
            }
        ];

        const sepultados = await Sepultado.aggregate(pipeline);

        res.status(200).json({
            sepultado: sepultados,
            total: sepultados.length,
            searchTerm: originalTerm
        });

    } catch (error) {
        console.error("Erro na pesquisa:", error);
        res.status(500).json({ message: "Erro interno do servidor ao realizar a pesquisa." });
    }
}





    // Método para busca rápida de sugestões - CORRIGIDO
    static async getSuggestions(req, res) {
        const { q } = req.query

        if (!q || q.trim() === "" || q.trim().length < 2) {
            res.status(200).json({ suggestions: [] })
            return
        }

        try {
            const searchTerm = removeAccents(q.trim());
            const originalTerm = q.trim();
            
            // Busca otimizada com ambos os termos
            const suggestions = await Sepultado.find({
                $or: [
                    { nome: { $regex: `^${originalTerm}`, $options: "i" } }, // Começar com o termo original
                    { nome: { $regex: `^${searchTerm}`, $options: "i" } },   // Começar com termo sem acento
                    { nome: { $regex: originalTerm, $options: "i" } },       // Contém termo original
                    { nome: { $regex: searchTerm, $options: "i" } }          // Contém termo sem acento
                ]
            }, {
                nome: 1,
                rua: 1,
                quadra: 1,
                chapa: 1,
                images: { $slice: 1 }
            })
            .sort({ nome: 1 })
            .limit(8) // Buscar um pouco mais para depois remover duplicatas

            // Remover duplicatas
            const uniqueSuggestions = suggestions.filter((item, index, self) => 
                index === self.findIndex(t => t._id.toString() === item._id.toString())
            ).slice(0, 5); // Limitar a 5 após remoção de duplicatas

            res.status(200).json({
                suggestions: uniqueSuggestions,
                total: uniqueSuggestions.length,
                searchTerm: originalTerm
            })

        } catch (error) {
            console.error("Erro ao buscar sugestões:", error)
            res.status(500).json({ suggestions: [] })
        }
    }

    // Método para busca com autocomplete mais avançado - CORRIGIDO
    static async getAutocomplete(req, res) {
        const { q } = req.query

        if (!q || q.trim() === "" || q.trim().length < 2) {
            res.status(200).json({ autocomplete: [] })
            return
        }

        try {
            const searchTerm = removeAccents(q.trim());
            const originalTerm = q.trim();
            
            // Buscar termos únicos para autocomplete com ambas as versões
            const nomes = await Sepultado.distinct("nome", {
                $or: [
                    { nome: { $regex: searchTerm, $options: "i" } },
                    { nome: { $regex: originalTerm, $options: "i" } }
                ]
            })
            
            const ruas = await Sepultado.distinct("rua", {
                $and: [
                    { rua: { $ne: null, $ne: "" } },
                    {
                        $or: [
                            { rua: { $regex: searchTerm, $options: "i" } },
                            { rua: { $regex: originalTerm, $options: "i" } }
                        ]
                    }
                ]
            })
            
            const quadras = await Sepultado.distinct("quadra", {
                $and: [
                    { quadra: { $ne: null, $ne: "" } },
                    {
                        $or: [
                            { quadra: { $regex: searchTerm, $options: "i" } },
                            { quadra: { $regex: originalTerm, $options: "i" } }
                        ]
                    }
                ]
            })

            // Combinar e limitar resultados, removendo duplicatas
            const allTerms = [
                ...nomes.slice(0, 4),
                ...ruas.slice(0, 3),
                ...quadras.slice(0, 3)
            ];
            
            // Remover duplicatas e limitar
            const autocomplete = [...new Set(allTerms)].slice(0, 8);

            res.status(200).json({
                autocomplete: autocomplete,
                searchTerm: originalTerm
            })

        } catch (error) {
            console.error("Erro no autocomplete:", error)
            res.status(500).json({ autocomplete: [] })
        }
    }



// ATRIBUIR um concessionário ao sepultado
static async assignConcessionario(req, res) {
  try {
    const id = req.params.id;                        // sepultado
    const { userId } = req.body || {};               // opcional p/ admin

    if (!ObjectId.isValid(id)) {
      return res.status(422).json({ message: "ID do sepultado inválido!" });
    }

    const token = getToken(req);
    const user = await getUserBytoken(token);
    if (!user) return res.status(401).json({ message: "Não autenticado" });

    const sep = await Sepultado.findById(id).select('concessionarios');
    if (!sep) return res.status(404).json({ message: "Sepultado não encontrado!" });

    const isAdmin = user.role === 'admin';
    const isConcessionario = user.role === 'concessionario';

    // Quem será atribuído?
    let targetUserId = isAdmin ? userId : user._id;

    if (!targetUserId || !ObjectId.isValid(String(targetUserId))) {
      return res.status(422).json({ message: "userId inválido (ou ausente)." });
    }

    // Concessionário só pode se atribuir a si mesmo
    if (isConcessionario && String(targetUserId) !== String(user._id)) {
      return res.status(403).json({ message: "Concessionário só pode se atribuir a si próprio." });
    }

    // Admin pode atribuir qualquer um; usuário comum não pode
    if (!isAdmin && !isConcessionario) {
      return res.status(403).json({ message: "Sem permissão para atribuir." });
    }

    const updated = await Sepultado.findByIdAndUpdate(
      id,
      { $addToSet: { concessionarios: targetUserId } },
      { new: true, select: 'concessionarios' }
    );

    return res.status(200).json({
      message: "Concessionário atribuído com sucesso!",
      concessionarios: updated.concessionarios,
    });
  } catch (error) {
    console.error("assignConcessionario erro:", error);
    return res.status(500).json({ message: error.message });
  }
}

// REMOVER atribuição de concessionário
static async unassignConcessionario(req, res) {
  try {
    const id = req.params.id;
    const { userId } = req.body || {};

    if (!ObjectId.isValid(id)) {
      return res.status(422).json({ message: "ID do sepultado inválido!" });
    }

    const token = getToken(req);
    const user = await getUserBytoken(token);
    if (!user) return res.status(401).json({ message: "Não autenticado" });

    const sep = await Sepultado.findById(id).select('concessionarios');
    if (!sep) return res.status(404).json({ message: "Sepultado não encontrado!" });

    const isAdmin = user.role === 'admin';
    const isConcessionario = user.role === 'concessionario';

    let targetUserId = isAdmin ? userId : user._id;

    if (!targetUserId || !ObjectId.isValid(String(targetUserId))) {
      return res.status(422).json({ message: "userId inválido (ou ausente)." });
    }

    // Concessionário só pode remover a si mesmo
    if (isConcessionario && String(targetUserId) !== String(user._id)) {
      return res.status(403).json({ message: "Concessionário só pode remover a própria atribuição." });
    }

    if (!isAdmin && !isConcessionario) {
      return res.status(403).json({ message: "Sem permissão para remover atribuição." });
    }

    const updated = await Sepultado.findByIdAndUpdate(
      id,
      { $pull: { concessionarios: targetUserId } },
      { new: true, select: 'concessionarios' }
    );

    return res.status(200).json({
      message: "Atribuição removida com sucesso!",
      concessionarios: updated.concessionarios,
    });
  } catch (error) {
    console.error("unassignConcessionario erro:", error);
    return res.status(500).json({ message: error.message });
  }
}






}