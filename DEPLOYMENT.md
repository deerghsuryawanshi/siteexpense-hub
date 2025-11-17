# Deployment Guide for Hostinger VPS

## Prerequisites
- VPS with SSH access
- Docker and Docker Compose installed on VPS
- Domain name (optional)

## Step-by-Step Deployment

### 1. Install Docker on Hostinger VPS

```bash
# SSH into your VPS
ssh your_username@your_vps_ip

# Update package list
sudo apt update

# Install required packages
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add your user to docker group
sudo usermod -aG docker ${USER}

# Log out and log back in for group changes to take effect
```

### 2. Transfer Your Project to VPS

**Option A: Using Git (Recommended)**
```bash
# On VPS
cd /home/your_username
git clone your_repository_url site-expense-tracker
cd site-expense-tracker
```

**Option B: Using SCP**
```bash
# On your local machine
scp -r /path/to/your/project your_username@your_vps_ip:/home/your_username/site-expense-tracker
```

### 3. Configure Environment Variables

```bash
# On VPS, in project directory
nano .env
```

Add your environment variables:
```
VITE_SUPABASE_PROJECT_ID=xocmgsfapgtckfdymxat
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvY21nc2ZhcGd0Y2tmZHlteGF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNzk2ODYsImV4cCI6MjA3NDc1NTY4Nn0.yy3NrC7zC9oDd4Cly6wT07HgWRRhn0ixFxWlBoAYXcY
VITE_SUPABASE_URL=https://xocmgsfapgtckfdymxat.supabase.co
```

### 4. Build and Run Docker Container

```bash
# Build the Docker image
docker-compose build

# Start the container
docker-compose up -d

# Check if container is running
docker ps
```

### 5. Configure Firewall

```bash
# Allow HTTP traffic
sudo ufw allow 80/tcp

# Allow HTTPS traffic (if using SSL)
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 6. Access Your Application

- Open browser and visit: `http://your_vps_ip:3000`

### 7. Set Up Domain Name (Optional)

**A. Point Domain to VPS**
- Go to your domain registrar
- Add an A record pointing to your VPS IP address

**B. Install Nginx as Reverse Proxy**
```bash
sudo apt install nginx

# Create nginx configuration
sudo nano /etc/nginx/sites-available/site-expense-tracker
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/site-expense-tracker /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

**C. Install SSL Certificate (HTTPS)**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot will automatically configure HTTPS
```

## Useful Docker Commands

```bash
# View logs
docker-compose logs -f

# Restart container
docker-compose restart

# Stop container
docker-compose down

# Rebuild after code changes
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Remove all containers and images
docker-compose down -v
docker system prune -a
```

## Updating Your Application

```bash
# Pull latest changes (if using Git)
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### Check container logs
```bash
docker-compose logs -f site-expense-tracker
```

### Check if port is in use
```bash
sudo netstat -tulpn | grep :3000
```

### Restart Docker service
```bash
sudo systemctl restart docker
```

### Check disk space
```bash
df -h
```

## Security Best Practices

1. **Change default SSH port**
2. **Set up fail2ban** for SSH protection
3. **Enable firewall** (ufw)
4. **Regular updates**: `sudo apt update && sudo apt upgrade`
5. **Use SSL certificates** (Let's Encrypt)
6. **Regular backups** of your database and files
7. **Monitor logs** regularly

## Support

For issues, check:
- Docker logs: `docker-compose logs`
- Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- System logs: `sudo journalctl -xe`
