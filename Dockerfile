# Etapa 1: build da aplicação Angular
FROM node:22-alpine AS build
WORKDIR /app
COPY . .
RUN npm install && npm run build

# Etapa 2: imagem leve com NGINX
FROM nginx:alpine
COPY --from=build /app/dist/gerar-cenario-teste-app/ /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
