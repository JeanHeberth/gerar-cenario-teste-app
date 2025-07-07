# Etapa de build
FROM node:20-alpine as build
WORKDIR /app
COPY . .
RUN npm install

# Etapa de produção
FROM nginx:stable-alpine
COPY --from=build /app/dist/gerar-cenario-teste-app /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
