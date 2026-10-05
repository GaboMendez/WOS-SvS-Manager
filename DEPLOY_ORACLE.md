# Deploy to Oracle Cloud (Always Free)

This guide covers deploying the WOS Prep Scheduler API to Oracle Cloud's free tier with persistent storage.

## Prerequisites

- Oracle Cloud account (free forever)
- GitHub repository with your code

## Step 1: Create Oracle Cloud Account

1. Go to https://cloud.oracle.com/
2. Sign up for a free account
3. Complete verification (requires credit card for identity verification, won't charge)

## Step 2: Create a Compute Instance

1. Log in to Oracle Cloud Console
2. Navigate to **Compute** → **Instances**
3. Click **Create Instance**
4. Configure:
   - **Name**: `wos-svs-api`
   - **Compartment**: Keep default
   - **Image**: Ubuntu 22.04 (or latest)
   - **Shape**: Always Free (e.g., VM.Standard.E2.1.Micro)
   - **Networking**: Keep default (new VCN + subnet)
   - **Add SSH Keys**: Generate new key pair or upload your public key
5. Click **Create**
6. Wait for instance to provision (2-3 minutes)

## Step 3: Configure Firewall

1. In your instance details, click **Subnet**
2. Click the **Security List**
3. Add ingress rules for:
   - Port 3001 (API)
   - Port 80 (HTTP)
   - Port 443 (HTTPS)

Or via OCI Console:
- Compute → Instances → Your Instance → Virtual Cloud Network → Security Lists → Add Rules

## Step 4: SSH into Your Instance

```bash
# Replace with your instance's public IP
ssh -i /path/to/your/private/key opc@<YOUR_INSTANCE_PUBLIC_IP>
```

## Step 5: Install Bun and Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Install Bun
curl -fsSL https://bun.sh/install | bash
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Step 6: Clone Your Repository

```bash
git clone https://github.com/GaboMendez/WOS-SvS-Manager.git
cd WOS-SvS-Manager
```

## Step 7: Set Up Persistent Storage

```bash
# Create data directory
sudo mkdir -p /app/data
sudo chown -R $(whoami) /app/data
```

## Step 8: Create Docker Compose File

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  api:
    build:
      context: .
      dockerfile: server/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - DOCKER=true
      - PORT=3001
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  frontend:
    build: .
    ports:
      - "8080:8080"
    environment:
      - VITE_API_URL=http://localhost:3001/api
    depends_on:
      - api
    restart: unless-stopped
EOF
```

## Step 9: Run the Application

```bash
# Build and start
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

## Step 10: Configure Domain (Optional)

1. Go to Oracle Cloud → Networking → DNS Zone
2. Create zone (e.g., `yourdomain.com`)
3. Add A record pointing to your instance IP
4. Use nginx or Caddy for reverse proxy with HTTPS

## Access Your API

- API: `http://<YOUR_INSTANCE_IP>:3001/api`
- Health: `http://<YOUR_INSTANCE_IP>:3001/health`

## Updating Your Deployment

```bash
# Pull latest changes and rebuild
git pull origin main
docker-compose up -d --build
```

## Troubleshooting

### Check Docker Status
```bash
sudo systemctl status docker
```

### Check Container Logs
```bash
docker-compose logs api
```

### Restart Services
```bash
docker-compose restart
```

### Check Port is Open
```bash
sudo netstat -tlnp | grep 3001
```

## Cost

This setup is **completely free**:
- Compute: Always Free (1 OCPU, 1GB RAM)
- Storage: 200GB block volume (free)
- Outbound bandwidth: 10TB/month (free)

## Backup Data

```bash
# Backup to local machine
scp -i /path/to/key opc@<IP>:/app/data/wos-svs-manager.db ./backup.db

# Restore
scp ./backup.db opc@<IP>:/app/data/wos-svs-manager.db
```
