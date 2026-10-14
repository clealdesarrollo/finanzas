# ==========================================================
# FINANCONTROL - DOCKERFILE MULTI-ETAPA (Node.js 20 Alpine)
# ==========================================================

# Etapa 1: Construcción de dependencias y frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar herramientas básicas necesarias
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

# Compilar frontend estático para producción
RUN npm run build

# Etapa 2: Imagen final liviana de ejecución
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Crear usuario sin privilegios de root por seguridad
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copiar dependencias de producción y archivos compilados
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/schema.sql ./schema.sql
COPY --from=builder /app/public ./public
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Crear directorio de datos persistentes local si se usa SQLite
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

# Verificación de salud (Healthcheck)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npm", "run", "start"]
