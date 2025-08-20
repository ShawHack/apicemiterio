const jwt = require('jsonwebtoken')
const getToken = require('./get-token-js')
const User = require('../models/User')

// middleware para validar token e popular req.user
const verifyToken = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || ''
    if (!auth) {
      return res.status(401).json({ message: 'Acesso Negado!' })
    }

    const token = getToken(req)
    if (!token) {
      return res.status(401).json({ message: 'Acesso Negado!' })
    }

    // Decodifica o JWT
    const verified = jwt.verify(token, process.env.JWT_SECRET)
    // Alguns tokens usam "_id", outros "id"
    const verifiedId = String(verified.id || verified._id || '')

    // Busca do banco para garantir role/name atualizados (e existência do user)
    let userDoc = null
    if (verifiedId) {
      userDoc = await User.findById(verifiedId).select('_id name role')
    }

    // Normaliza dados do usuário
    const role = (userDoc?.role || verified.role || 'usuario').toString()
    const name = userDoc?.name || verified.name || 'Usuário'

    // 🔑 MUITO IMPORTANTE: defina **ambos** os campos
    req.user = {
      _id: userDoc?._id?.toString() || verifiedId,
      id: userDoc?._id?.toString() || verifiedId,
      name,
      role,
    }

    if (!req.user._id) {
      // usuário do token não existe mais no banco
      return res.status(401).json({ message: 'Usuário não encontrado / sessão inválida.' })
    }

    return next()
  } catch (err) {
    // Token expirado ou inválido
    const status = err?.name === 'TokenExpiredError' ? 401 : 400
    return res.status(status).json({ message: 'Token inválido!' })
  }
}

module.exports = verifyToken
