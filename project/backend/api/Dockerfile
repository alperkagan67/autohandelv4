# Build Stage
FROM node:18-slim

# Installiere Puppeteer Dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxss1 \
    libxrandr2 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

# Setze Puppeteer auf Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
RUN ls -al
# Kopiere package.json und package-lock.json
COPY package*.json ./

# Installiere Dependencies
RUN npm install

# Kopiere den Rest des Codes
COPY . .

# Expose Port
EXPOSE 3001

# Starte die Anwendung
CMD ["npm", "start"] 