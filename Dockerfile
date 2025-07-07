# Etapa de build (constrói app e servidor SSR)
FROM node:20-alpine AS build

# Define diretório de trabalho
WORKDIR /app

# Copia arquivos do projeto
COPY . .

# Instala dependências
RUN npm install

# Constrói a aplicação e o servidor SSR
RUN npm run build:ssr

# Etapa de produção com Node.js
FROM node:20-alpine

# Define diretório de trabalho
WORKDIR /app

# Copia dist e dependências do build
COPY --from=build /app/dist /app/dist
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json .

# Expõe a porta usada pelo SSR
EXPOSE 4000

# Comando para iniciar o servidor SSR
CMD ["node", "dist/gerar-cenario-teste-app/server/main.js"]
