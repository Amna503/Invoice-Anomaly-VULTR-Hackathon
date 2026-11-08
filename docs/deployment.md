# Deployment Guide

## Vultr Cloud Compute Deployment

This guide covers deploying Invoice Anomaly Desk on a Vultr Cloud Compute VM.

## Prerequisites

- Vultr Cloud Compute VM (Ubuntu 22.04 LTS recommended)
- Vultr Serverless Inference API key
- Docker and Docker Compose installed on VM

## Quick Start

1. **Provision Vultr VM**

   - Size: 2 vCPUs, 4GB RAM minimum
   - OS: Ubuntu 22.04 LTS
   - Storage: 50GB minimum
   - Enable firewall: Allow ports 80, 443, 22

2. **Connect to VM**

   ```bash
   ssh root@your-vultr-vm-ip
   ```

3. **Install Docker**

   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   apt-get update
   apt-get install -y docker-compose-plugin
   ```

4. **Clone Repository**

   ```bash
   git clone https://github.com/yourusername/invoice-anomaly-desk.git
   cd invoice-anomaly-desk
   ```

5. **Configure Environment**

   ```bash
   cp .env.example .env
   nano .env
   ```

   **Required variables:**
   ```env
   VULTR_INFERENCE_API_KEY=your-vultr-api-key
   ADMIN_TOKEN=generate-secure-32-char-token
   MONGO_ROOT_PASSWORD=generate-secure-password
   ```

6. **Deploy**

   ```bash
   chmod +x deploy/deploy.sh
   ./deploy/deploy.sh
   ```

7. **Verify Deployment**

   ```bash
   curl http://localhost:3000/api/health
   ```

## Production Deployment

For production deployments with nginx reverse proxy and SSL:

### Using Production Docker Compose

The production configuration (`docker-compose.prod.yml`) includes nginx, removes exposed MongoDB ports, and configures resource limits.

1. **Set Up MongoDB Authentication**

   Add these to your `.env` file:
   ```env
   MONGO_INITDB_ROOT_USERNAME=admin
   MONGO_INITDB_ROOT_PASSWORD=your-secure-password-here
   ```

   Update your `MONGODB_URI` in `.env`:
   ```env
   MONGODB_URI=mongodb://admin:your-secure-password-here@mongodb:27017/invoice-anomaly?authSource=admin
   ```

2. **Prepare Frontend Build**

   Your frontend teammate should build the React app and place the build output in `/frontend/dist`:
   ```bash
   # On local machine or CI
   cd frontend
   npm run build
   
   # Transfer to server
   scp -r dist/ root@your-server-ip:/path/to/invoice-anomaly-desk/frontend/
   ```

3. **Deploy with Production Config**

   ```bash
   # Use both docker-compose files
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   
   # Or for production-only deployment
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

4. **Configure SSL with Let's Encrypt**

   ```bash
   # Install certbot
   apt-get update
   apt-get install -y certbot python3-certbot-nginx
   
   # Stop nginx container temporarily
   docker-compose -f docker-compose.prod.yml stop nginx
   
   # Obtain certificate
   certbot certonly --standalone -d yourdomain.com
   
   # Edit deploy/nginx.conf and uncomment the SSL server block
   # Update server_name to your domain
   nano deploy/nginx.conf
   
   # Restart nginx
   docker-compose -f docker-compose.prod.yml up -d nginx
   
   # Set up auto-renewal
   echo "0 3 * * * certbot renew --quiet --post-hook 'docker-compose -f /path/to/docker-compose.prod.yml restart nginx'" | crontab -
   ```

### Alternative: Coolify Deployment

[Coolify](https://coolify.io/) is a self-hosted alternative to Heroku/Vercel that simplifies deployment with a web UI.

**Why Coolify?**
- One-click deployments from Git
- Automatic SSL certificates
- Built-in monitoring and logs
- Zero-downtime deployments
- Resource management via dashboard

**Setup:**
1. Install Coolify on your Vultr VM: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`
2. Access Coolify dashboard at `http://your-server-ip:8000`
3. Connect your Git repository
4. Configure environment variables via UI
5. Coolify handles Docker, nginx, and SSL automatically

See [Coolify documentation](https://coolify.io/docs) for detailed setup.

### Post-Deploy Checklist

After production deployment, verify:

```bash
# 1. Health check from public URL
curl https://yourdomain.com/api/health
# Expected: {"status":"healthy","timestamp":"...","uptime":...}

# 2. Upload functionality works
curl -X POST https://yourdomain.com/api/upload \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@test-invoice.pdf"

# 3. Vultr inference connection
curl https://yourdomain.com/api/detect \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invoiceId":"test-id"}'

# 4. MongoDB port NOT publicly accessible
netstat -tuln | grep 27017
# Expected: Should show 127.0.0.1:27017 or no output (internal only)

# 5. Verify SSL certificate
curl -vI https://yourdomain.com 2>&1 | grep -i "SSL connection"

# 6. Check resource usage
docker stats --no-stream

# 7. Verify all services running
docker-compose -f docker-compose.prod.yml ps
```

**Common Issues:**
- Frontend shows blank page: Check that `/frontend/dist` exists and contains `index.html`
- API CORS errors: Update `CORS_ORIGIN` in `.env` to match your domain
- MongoDB connection failed: Verify `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` match in all places
- 502 Bad Gateway: Backend service not ready, check `docker-compose logs backend`

## Nginx Reverse Proxy (Optional)

For production with custom domain:

1. **Install Nginx**

   ```bash
   apt-get install -y nginx
   ```

2. **Configure Nginx**

   ```bash
   cp deploy/nginx.conf /etc/nginx/sites-available/invoice-anomaly
   ln -s /etc/nginx/sites-available/invoice-anomaly /etc/nginx/sites-enabled/
   rm /etc/nginx/sites-enabled/default
   
   nginx -t
   systemctl restart nginx
   ```

3. **SSL with Let's Encrypt** (Recommended)

   ```bash
   apt-get install -y certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.com
   ```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VULTR_INFERENCE_API_KEY` | ✅ | - | Vultr Serverless Inference API key |
| `ADMIN_TOKEN` | ✅ | - | Admin authentication token (32+ chars) |
| `MONGO_ROOT_PASSWORD` | ✅ | - | MongoDB root password |
| `PORT` | | 3000 | Backend API port |
| `NODE_ENV` | | production | Environment (production/development) |
| `MODEL_NAME` | | meta/llama-3.1-70b-instruct | Vultr AI model |
| `MAX_FILE_SIZE_MB` | | 10 | Max upload size per file |
| `CORS_ORIGIN` | | http://localhost:5173 | Frontend origin (comma-separated for multiple) |
| `LOG_LEVEL` | | info | Log level (debug/info/warn/error) |

## Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View running containers
docker ps

# Enter backend container
docker exec -it invoice-anomaly-backend sh
```

## Maintenance

### Backup MongoDB

```bash
# Backup
docker exec invoice-anomaly-mongodb mongodump \
  --username admin \
  --password $MONGO_ROOT_PASSWORD \
  --authenticationDatabase admin \
  --out /data/backup

# Copy backup out of container
docker cp invoice-anomaly-mongodb:/data/backup ./mongodb-backup-$(date +%Y%m%d)
```

### Restore MongoDB

```bash
# Copy backup into container
docker cp ./mongodb-backup invoice-anomaly-mongodb:/data/restore

# Restore
docker exec invoice-anomaly-mongodb mongorestore \
  --username admin \
  --password $MONGO_ROOT_PASSWORD \
  --authenticationDatabase admin \
  /data/restore
```

### Update Application

```bash
cd /path/to/invoice-anomaly-desk
git pull
docker-compose up -d --build
```

### View Resource Usage

```bash
docker stats
```

### Clean Up

```bash
# Remove stopped containers
docker system prune

# Remove unused volumes (⚠️ destroys data)
docker volume prune
```

## Monitoring

### Health Check

```bash
curl http://localhost:3000/api/health
```

### Application Logs

```bash
# Real-time logs
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### System Metrics

```bash
# CPU, Memory, Disk
htop
df -h
free -h
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs backend

# Check if ports are in use
netstat -tuln | grep 3000

# Restart services
docker-compose restart
```

### MongoDB Connection Issues

```bash
# Check MongoDB logs
docker-compose logs mongodb

# Test connection
docker exec -it invoice-anomaly-mongodb mongosh \
  -u admin -p $MONGO_ROOT_PASSWORD --authenticationDatabase admin
```

### Vultr AI API Errors

```bash
# Test API connection
cd backend
node scripts/listModels.js
```

Check:
- API key is correct in .env
- Vultr account has credits
- Model name matches available models

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes

# Check large files
du -sh /*
```

## Security Checklist

- ✅ Change default MongoDB password
- ✅ Generate strong ADMIN_TOKEN (32+ characters)
- ✅ Enable UFW firewall
- ✅ Configure fail2ban for SSH
- ✅ Set up SSL with Let's Encrypt
- ✅ Keep system updated (`apt-get update && apt-get upgrade`)
- ✅ Restrict MongoDB to localhost only
- ✅ Use environment variables, never commit secrets
- ✅ Enable audit logging
- ✅ Regular backups

## Firewall Configuration

```bash
# Install UFW
apt-get install -y ufw

# Allow SSH
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw enable
```

## Production Checklist

Before going live:

- [ ] Domain configured with DNS
- [ ] SSL certificate installed
- [ ] ADMIN_TOKEN is strong and unique
- [ ] MongoDB password is strong and unique
- [ ] CORS_ORIGIN set to production domain
- [ ] NODE_ENV=production
- [ ] Log level set to 'info' or 'warn'
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Firewall configured
- [ ] System updates applied

## Support

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment: `cat .env`
3. Check health: `curl http://localhost:3000/api/health`
4. Review deployment guide
5. Check GitHub issues
