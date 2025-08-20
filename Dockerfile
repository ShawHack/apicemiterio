# Imagem leve e estável do Node
FROM node:20-alpine

# Dependências nativas (úteis caso alguma lib use bindings, ex: sharp/bcrypt)
RUN apk add --no-cache python3 make g++

# Diretório da aplicação
WORKDIR /app

# Copia apenas os manifests para instalar deps em cache de build
COPY package*.json ./

# Instala somente dependências de produção (usa package-lock se existir)
RUN npm ci --omit=dev || npm install --omit=dev

# Copia o restante do código
COPY . .

# Garante o diretório de uploads usado pelo projeto
RUN mkdir -p /app/public/images/sepultados

# Variáveis padrão (podem ser sobrescritas no compose/run)
ENV NODE_ENV=production
ENV PORT=5000

# Porta interna da API
EXPOSE 5000

# (Opcional) Healthcheck simples — ajuste a rota conforme seu servidor
# HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
#   CMD wget -qO- http://127.0.0.1:5000/health || exit 1

# Início da aplicação
# Se o seu arquivo de entrada for diferente (ex: app.js/index.js), ajuste abaixo.
CMD ["node", "server.js"]

