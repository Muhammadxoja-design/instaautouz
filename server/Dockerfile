FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build backend
RUN npm run build:backend

EXPOSE 3000

CMD ["npm", "start"]
