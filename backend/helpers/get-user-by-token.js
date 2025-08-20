const jwt = require('jsonwebtoken')
const User = require("../models/User")

const getUserByToken = async (token) => {
  if (!token) {
    return null // não retorna res aqui, deixa a rota decidir a resposta
  }

  try {
    // verifica token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.JWT_SECRET)
    const userId = decoded.id

    // busca usuário no banco
    const user = await User.findById(userId).select("-password") // não retorna senha

    return user
  } catch (err) {
    console.error("Erro ao verificar token:", err.message)
    return null
  }
}

module.exports = getUserByToken
