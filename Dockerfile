# Stage 1: Build Web App
FROM node:22-alpine AS builder

WORKDIR /app

# Salin dependencies manifest
COPY package*.json ./

# Install dependencies secara bersih & reproducible
RUN npm ci

# Salin seluruh source code proyek
COPY . .

# Kompilasi aplikasi web untuk produksi (output: dist/web)
RUN npm run build:web

# Stage 2: Serve dengan Nginx
FROM nginx:alpine AS runner

# Salin hasil build static files dari stage builder
COPY --from=builder /app/dist/web /usr/share/nginx/html

# Salin konfigurasi kustom Nginx (SPA fallback, caching, gzip, & Indodax proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Port default HTTP
EXPOSE 80

# Jalankan server Nginx di foreground
CMD ["nginx", "-g", "daemon off;"]
