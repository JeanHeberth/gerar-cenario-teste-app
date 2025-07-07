# Etapa de build
FROM node:20-alpine AS build

WORKDIR /app
COPY . .

# Instala as dependências
RUN npm install

# Build de produção Angular (sem SSR)
RUN npm run build --configuration production

# Etapa de produção (servidor nginx)
FROM nginx:stable-alpine

# Copia os arquivos gerados para o diretório público do nginx
COPY --from=build /app/dist/gerar-cenario-teste-app /usr/share/nginx/html

# Remove configuração default do nginx (opcional)
RUN rm /etc/nginx/conf.d/default.conf

# Adiciona uma nova configuração básica (opcional)
RUN echo 'server { listen 80; server_name localhost; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
