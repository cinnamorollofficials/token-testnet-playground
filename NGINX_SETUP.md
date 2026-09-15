# Panduan Setup Nginx (Token Testing Playground)

Dokumentasi ini mencakup dua skenario utama dalam mengatur Nginx:
1. **Skenario A (Paling Populer & Direkomendasikan):** Nginx di VPS/Host sebagai Reverse Proxy ke Docker Container + SSL HTTPS (Let's Encrypt).
2. **Skenario B:** Nginx internal container (`nginx.conf`) & cara kerjanya.
3. **Skenario C:** Deploy langsung di Nginx Host tanpa Docker (Native Build).

---

## 1. Arsitektur Skenario A (Docker + Nginx Host Reverse Proxy)

```
[ Internet / Browser Pengguna ]
              │
              ▼ (Port 80 / 443 HTTPS)
   ┌───────────────────────┐
   │    Nginx di Host/VPS  │  <-- Handle Domain & Sertifikat SSL Let's Encrypt
   └──────────┬────────────┘
              │ (Proxy pass ke http://127.0.0.1:3001)
              ▼
   ┌───────────────────────┐
   │ Docker Container      │
   │ (token-playground)    │
   │  - Nginx Internal :80 │  <-- Handle SPA fallback & proxy Indodax
   │  - Static dist/web    │
   └───────────────────────┘
```

---

## 2. Langkah Setup Nginx Host + SSL (Skenario A)

### Langkah 1: Install Nginx di Server/VPS
Jika server Anda menggunakan **Ubuntu / Debian**:
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Pastikan Nginx berjalan dan aktif saat boot:
```bash
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

### Langkah 2: Buat Konfigurasi Reverse Proxy
Buat file konfigurasi server block baru di `/etc/nginx/sites-available/token-playground.conf`:
```bash
sudo nano /etc/nginx/sites-available/token-playground.conf
```

Isi dengan konfigurasi berikut (ganti `playground.domainanda.com` dengan domain/subdomain Anda):

```nginx
server {
    listen 80;
    server_name playground.domainanda.com;

    # Batas ukuran payload request (opsional)
    client_max_body_size 20M;

    # Logging
    access_log /var/log/nginx/token_playground_access.log;
    error_log /var/log/nginx/token_playground_error.log;

    location / {
        # Mengarahkan ke port Docker container (default 3001)
        proxy_pass http://127.0.0.1:3001;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

---

### Langkah 3: Aktifkan Konfigurasi & Uji Sintaks
Buat symbolic link ke folder `sites-enabled`:
```bash
sudo ln -s /etc/nginx/sites-available/token-playground.conf /etc/nginx/sites-enabled/
```

Uji apakah konfigurasi tidak ada error sintaks:
```bash
sudo nginx -t
```
Jika muncul pesan `syntax is ok` dan `test is successful`, reload Nginx:
```bash
sudo systemctl reload nginx
```

---

### Langkah 4: Pasang SSL Gratis (Let's Encrypt HTTPS)
Gunakan Certbot untuk menginstal SSL secara otomatis:
```bash
sudo certbot --nginx -d playground.domainanda.com
```
Certbot akan otomatis memperbarui konfigurasi Nginx untuk redirect HTTP ke HTTPS port 443 dan menyiapkan auto-renewal sertifikat.

---

## 3. Penjelasan Konfigurasi Nginx Internal Docker (`nginx.conf`)

File [`nginx.conf`](file:///Users/hadiyahku/code/test-playground/nginx.conf) di root repository ini digunakan di dalam container Docker (`nginx:alpine`).

### Poin Kunci Konfigurasinya:
1. **SPA Routing Fallback:**
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```
   Aplikasi berbasis React/Vite adalah Single Page App (SPA). Baris ini memastikan saat pengguna merefresh halaman sub-rute (seperti `/send`, `/tokens`), Nginx tidak me-return 404 Not Found, melainkan kembali menyajikan `index.html`.

2. **Reverse Proxy Indodax API (Bypass CORS Browser):**
   ```nginx
   location /api/indodax/ {
       proxy_pass https://indodax.com/api/;
       proxy_ssl_server_name on;
       proxy_set_header Host indodax.com;
   }
   ```
   Browser memblokir request langsung ke `https://indodax.com/api` karena kebijakan CORS. Nginx internal bertindak sebagai proxy server-to-server yang meneruskan permintaan ticker harga secara transparan.

3. **WebAssembly MIME Type (`.wasm`):**
   ```nginx
   types {
       application/wasm wasm;
   }
   ```
   Project ini menggunakan library crypto berbasis WebAssembly (`mpt_crypto-Blloi7rq.wasm`). MIME type ini wajib agar browser mengizinkan kompilasi streaming WebAssembly.

4. **Gzip & Caching:**
   Semua file static di `/assets/` diberi cache header `Cache-Control: public, immutable` selama 1 tahun karena nama filenya memiliki hash unik hasil build Vite.

---

## 4. Alternatif: Deploy Langsung di Nginx Host Tanpa Docker (Skenario C)

Jika Anda ingin mendeploy langsung di VPS tanpa Docker sama sekali:

```bash
# 1. Di server, clone repo dan install dependencies
npm install

# 2. Build aplikasi web
npm run build:web
# Hasil build ada di folder dist/web

# 3. Salin ke direktori web server
sudo mkdir -p /var/www/token-playground
sudo cp -r dist/web/* /var/www/token-playground/

# 4. Buat server block Nginx di /etc/nginx/sites-available/token-playground.conf
```

Isi konfigurasi server block:
```nginx
server {
    listen 80;
    server_name playground.domainanda.com;

    root /var/www/token-playground;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json application/wasm;

    types {
        application/wasm wasm;
    }

    location /api/indodax/ {
        proxy_pass https://indodax.com/api/;
        proxy_ssl_server_name on;
        proxy_set_header Host indodax.com;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 5. Cheat Sheet Perintah Nginx

| Perintah | Fungsi |
|---|---|
| `sudo nginx -t` | Mengecek apakah sintaks file konfigurasi valid |
| `sudo systemctl reload nginx` | Menerapkan perubahan config tanpa downtime |
| `sudo systemctl restart nginx` | Me-restart service Nginx secara menyeluruh |
| `sudo systemctl status nginx` | Memeriksa status service Nginx |
| `sudo tail -f /var/log/nginx/error.log` | Memantau log error Nginx secara real-time |
| `sudo certbot renew --dry-run` | Mengetes simulasi perpanjangan sertifikat SSL |
