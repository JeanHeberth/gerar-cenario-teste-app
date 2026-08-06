# Etapa de build
FROM node:20-alpine AS build
WORKDIR /app

# Copia os arquivos do projeto
COPY . .

# Instala dependências
RUN npm install

# Gera build padrão (sem depender de ambientes)
RUN npm run build

# Etapa final: usar Nginx para servir o conteúdo
FROM nginx:stable-alpine
COPY --from=build /app/dist/gerar-cenario-teste-app /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
