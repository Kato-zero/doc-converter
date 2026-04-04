FROM node:18-alpine

# Install LibreOffice
RUN apk add --no-cache libreoffice

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p uploads

EXPOSE 3001

CMD ["node", "server.js"]
