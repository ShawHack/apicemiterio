const mongoose = require('../db/conn')
const { Schema } = mongoose

// Subdocumento de comentário
const ComentarioSchema = new Schema(
  {
    autor: { type: String, default: 'Anônimo', trim: true },
    texto: { type: String, required: true, trim: true, maxlength: 1000 },
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // quem comentou
    createdAt: { type: Date, default: Date.now },

    // soft-delete / moderação (opcionais; não afetam o fluxo atual)
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deleteReason: { type: String, trim: true, maxlength: 300 },
  },
  { _id: true }
)

// índice útil para listagem por data (opcional)
ComentarioSchema.index({ createdAt: -1 })

const SepultadoSchema = new Schema(
  {
    id: { type: String },

    nome: { type: String, required: true },

   

    cemiterio: { type: String },

    chapa: { type: String, required: true },

    idade: { type: String },

    // ⚠️ Mantidas como string (frontend não formata)
    dtFal: { type: String, required: true },
    dtNasc: { type: String, required: true },

    mae: { type: String, required: true },
    nacionalidade: { type: String, required: true },
    pai: { type: String, required: true },

    moderacao: { type: Boolean },

    latitude: { type: Number },
    longitude: { type: Number },

    quadra: { type: String, required: true },
    tipoSepultura: { type: String },
    rua: { type: String, required: true },

    epitafio: { type: String, trim: true },

    // ✅ Comentários no formato novo
    comentarios: { type: [ComentarioSchema], default: [] },

    available: { type: Boolean },

    images: { type: [String] },

    user: {
      _id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      name: { type: String, required: true },
      image: { type: String },
      phone: { type: String },
    },

    concessionarios: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
  },
  { timestamps: true }
)

/* Índices úteis para suas buscas (regex em nome/rua/quadra/chapa) */
SepultadoSchema.index({ nome: 1 })
SepultadoSchema.index({ rua: 1 })
SepultadoSchema.index({ quadra: 1 })
SepultadoSchema.index({ chapa: 1 })
SepultadoSchema.index({ 'user._id': 1 })
SepultadoSchema.index({ concessionarios: 1 })

module.exports = mongoose.model('Sepultado', SepultadoSchema)
