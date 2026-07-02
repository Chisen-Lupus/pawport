#!/bin/bash
# deploy.sh - PawPort deployment script
# Usage: ./deploy.sh [local|remote]

set -e

MODE=${1:-local}
REMOTE_HOST="45.32.59.92"
REMOTE_USER="root"
REMOTE_PATH="/www/wwwroot/pawport.me"

echo "🐾 PawPort Deployment - Mode: $MODE"
echo "=================================="

if [ "$MODE" = "local" ]; then
    echo "📦 Setting up local development environment..."
    
    # Check prerequisites
    command -v node >/dev/null 2>&1 || { echo "❌ Node.js required"; exit 1; }
    echo "🗄️ Local development uses SQLite by default. Set DB_DIALECT=mysql in .env when you want MySQL."
    
    # Install backend dependencies
    echo "📥 Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    # Install frontend dependencies
    echo "📥 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    # Initialize and seed database
    echo "🌱 Initializing database..."
    cd backend
    node database/init.js --force
    node database/seed.js
    cd ..
    
    echo ""
    echo "✅ Local setup complete!"
    echo ""
    echo "📋 To start development:"
    echo "  Terminal 1: cd backend && npm run dev"
    echo "  Terminal 2: cd frontend && npm run dev"
    echo ""
    echo "🌐 Access: http://localhost:5173"
    echo ""
    echo "📝 Test accounts:"
    echo "  foxfire@test.com / test123456"
    echo "  admin@pawport.me / test123456"

elif [ "$MODE" = "remote" ]; then
    echo "🚀 Deploying to remote server..."
    
    # Build frontend
    echo "🔨 Building frontend..."
    cd frontend
    npm run build
    cd ..
    
    # Create deployment package
    echo "📦 Creating deployment package..."
    tar -czf deploy.tar.gz \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='frontend/node_modules' \
        --exclude='backend/node_modules' \
        config/ backend/ frontend/dist/
    
    # Upload to server
    echo "📤 Uploading to server..."
    scp deploy.tar.gz ${REMOTE_USER}@${REMOTE_HOST}:/tmp/
    
    # Execute remote setup
    ssh ${REMOTE_USER}@${REMOTE_HOST} << 'REMOTE_SCRIPT'
        echo "📂 Setting up on remote..."
        mkdir -p /www/wwwroot/pawport.me
        cd /www/wwwroot/pawport.me
        tar -xzf /tmp/deploy.tar.gz
        rm /tmp/deploy.tar.gz
        
        # Install backend deps
        cd backend
        npm install --production
        
        # Setup database
        node database/init.js
        
        # Setup PM2
        pm2 delete pawport 2>/dev/null || true
        pm2 start server.js --name pawport --env production
        pm2 save
        
        echo "✅ Remote deployment complete!"
REMOTE_SCRIPT
    
    rm deploy.tar.gz
    echo "✅ Deployment finished!"
    echo "🌐 Site: https://pawport.me"

elif [ "$MODE" = "sync-fcc" ]; then
    echo "🔄 Running FCC sync..."
    cd backend
    node services/fccSync.js --once
    
else
    echo "Usage: ./deploy.sh [local|remote|sync-fcc]"
    exit 1
fi
