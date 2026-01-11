# Messaging Intelligence Platform - Setup Guide

This guide walks you through setting up the complete Messaging Intelligence Platform on an Azure VM.

---

## Prerequisites

- **Azure Account** with ability to create VMs
- **DuckDNS Account** for free domain
- **Instagram Account** for bridge testing
- **Basic knowledge** of Docker and Linux commands

---

## Phase 1: Azure VM Setup

### Step 1: Create the VM

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → **Virtual Machine**
3. Configure:

| Setting | Value |
|---------|-------|
| Subscription | Your subscription |
| Resource Group | Create new: `mip-resources` |
| VM Name | `mip-server` |
| Region | Choose closest to you |
| Image | Ubuntu Server 22.04 LTS |
| Size | B1s (1 vCPU, 1 GB RAM) |
| Authentication | SSH public key |
| Username | `azureuser` |

4. **Networking**: 
   - Create new virtual network
   - Create new public IP (Static)
   
5. Click **Review + Create** → **Create**

### Step 2: Configure Network Security Group

Add inbound rules for:

| Priority | Port | Protocol | Source | Description |
|----------|------|----------|--------|-------------|
| 100 | 22 | TCP | Your IP | SSH |
| 110 | 80 | TCP | Any | HTTP |
| 120 | 443 | TCP | Any | HTTPS |
| 130 | 8448 | TCP | Any | Matrix Federation |

### Step 3: Connect to VM

```bash
ssh azureuser@<your-vm-public-ip>
```

---

## Phase 2: DuckDNS Setup

### Step 1: Register Domain

1. Go to [DuckDNS](https://www.duckdns.org)
2. Login with your preferred method
3. Create a subdomain: `dailyfix-matrix` (or your choice)
4. Point it to your Azure VM's public IP

### Step 2: Auto-Update IP (Optional)

```bash
# Create update script
mkdir -p ~/duckdns
cat > ~/duckdns/duck.sh << 'EOF'
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=YOUR_DOMAIN&token=YOUR_TOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
EOF

chmod +x ~/duckdns/duck.sh

# Add to crontab
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -
```

---

## Phase 3: Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose

# Enable Docker
sudo systemctl enable docker
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again
exit
# Then reconnect
```

---

## Phase 4: Clone and Configure

### Step 1: Get the Code

```bash
# Clone or copy the project
git clone <your-repo> mip
cd mip

# Or create directories manually
mkdir -p mip/{infra,matrix,bridge,ai-service,frontend,docs}
```

### Step 2: Configure Environment

```bash
cd mip/infra

# Edit the .env file
nano .env
```

Update these values:
- `DOMAIN` - Your DuckDNS domain
- `DUCKDNS_TOKEN` - Your DuckDNS token
- `MATRIX_SERVER_NAME` - Same as domain
- `LETSENCRYPT_EMAIL` - Your email

### Step 3: Generate SSL Certificates (Self-signed for now)

```bash
mkdir -p nginx/ssl
cd nginx/ssl

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/CN=dailyfix-matrix.duckdns.org"

cd ../..
```

---

## Phase 5: Initialize Matrix Synapse

### Step 1: Generate Signing Key

```bash
cd ../matrix

# Generate signing key
docker run --rm \
  -v $(pwd):/data \
  matrixdotorg/synapse:latest \
  generate

# This creates homeserver.yaml and signing.key
# We already have homeserver.yaml, just need the key
```

### Step 2: Create Required Directories

```bash
mkdir -p appservices media_store
chmod 777 media_store
```

---

## Phase 6: Start Services

### Step 1: Start Core Services

```bash
cd ../infra

# Start PostgreSQL and Redis first
docker-compose up -d redis

# Wait a moment
sleep 10

# Start Synapse
docker-compose up -d synapse

# Check logs
docker-compose logs -f synapse
```

### Step 2: Create Admin User

```bash
# Register admin user
docker exec -it matrix-synapse register_new_matrix_user \
  -u admin \
  -p YourSecurePassword123! \
  -a \
  -c /data/homeserver.yaml \
  http://localhost:8008
```

### Step 3: Start Remaining Services

```bash
# Start all services
docker-compose up -d

# Check all are running
docker-compose ps
```

---

## Phase 7: Configure Instagram Bridge

### Step 1: Initialize Bridge

```bash
# The bridge should auto-start
# Check logs for initial setup
docker-compose logs mautrix-instagram
```

### Step 2: Login to Instagram

1. Login to Element or another Matrix client
2. Start a chat with `@instagrambot:dailyfix-matrix.duckdns.org`
3. Send: `login`
4. Follow the prompts to authenticate with Instagram

### Step 3: Verify Bridge

1. Send a test message on Instagram
2. Check if it appears in Matrix

---

## Phase 8: Verify Installation

### Check All Services

```bash
# Health checks
curl http://localhost:8008/_matrix/client/versions
curl http://localhost:8000/health
curl http://localhost:3000
```

### Access the Platform

1. Open browser to `https://your-domain.duckdns.org`
2. Login with your Matrix credentials
3. Verify dashboard loads

---

## Troubleshooting

### Common Issues

**Synapse won't start**
```bash
docker-compose logs synapse
# Check for database connection issues
```

**Bridge not connecting**
```bash
docker-compose logs mautrix-instagram
# Verify appservice registration paths
```

**Frontend 502 errors**
```bash
docker-compose logs nginx
docker-compose logs frontend
# Check container networking
```

### Useful Commands

```bash
# Restart all services
docker-compose restart

# View real-time logs
docker-compose logs -f

# Rebuild containers
docker-compose up -d --build

# Remove all and start fresh
docker-compose down -v
docker-compose up -d
```

---

## Next Steps

1. **Production Hardening**
   - Enable proper SSL with Let's Encrypt
   - Disable Matrix registration
   - Set strong passwords

2. **Testing**
   - Follow the testing guide
   - Verify all AI features

3. **Demo**
   - Prepare demo walkthrough
   - Record Loom video

---

## Quick Start Commands

```bash
# One-liner to start everything
cd mip/infra && docker-compose up -d

# Check status
docker-compose ps

# View all logs
docker-compose logs -f

# Stop everything
docker-compose down
```
