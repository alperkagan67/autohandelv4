# Build Stage
FROM node:18-alpine as build

WORKDIR /app

# Kopiere package.json und package-lock.json
COPY package*.json ./

# Installiere Dependencies
RUN npm install

# Kopiere den Rest des Codes
COPY . .

# Baue die Anwendung
RUN npm run build

# Production Stage
FROM nginx:alpine

# Kopiere die gebaute Anwendung
COPY --from=build /app/dist /usr/share/nginx/html

# Kopiere die nginx Konfiguration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 