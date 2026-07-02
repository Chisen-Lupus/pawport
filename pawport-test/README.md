# 🐾 PawPort.me

A furry convention tracking website that lets users mark conventions they've attended and see where others have been.

## Quick Start (macOS Local Development)

### Prerequisites
- Node.js 18+ (`brew install node`)
- SQLite is used automatically for local development. MySQL is only needed when you choose `DB_DIALECT=mysql` for production-like testing.

### Setup

```bash
# 1. Clone and enter project
cd pawport

# 2. Run local setup
chmod +x deploy.sh
./deploy.sh local

# 3. Start backend (Terminal 1)
cd backend && npm run dev

# If port 3001 is occupied
PORT=3011 npm run dev

# 4. Start frontend (Terminal 2) 
cd frontend && npm run dev

# If backend is on 3011
BACKEND_PORT=3011 npm run dev

# 5. Open browser
open http://localhost:5173
```

### Test Accounts
| Account | Password |
|---------|----------|
| foxfire@test.com | test123456 |
| bluedragon@test.com | test123456 |
| greenwolf@test.com | test123456 |
| purplecat@test.com | test123456 |
| admin@pawport.me | test123456 |

## Configuration

### `config/app.config.js`
- Domain/IP settings
- Feature flags (test data, FCC sync, animations)
- Map tile server configuration
- Extension toggles for future features

### `config/secrets.config.js`  
- Database settings (`sqlite` locally, `mysql` in production)
- JWT secret
- OAuth keys
- FCC API token

## Deployment to Production

```bash
./deploy.sh remote
```

This will:
1. Build the frontend
2. Package the project
3. Upload to 45.32.59.92
4. Install dependencies
5. Setup PM2 process manager

### Nginx Config (via BaoBao Panel)
```nginx
server {
    listen 80;
    server_name pawport.me;
    
    root /www/wwwroot/pawport.me/frontend/dist;
    index index.html;
    
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /uploads {
        proxy_pass http://127.0.0.1:3000;
    }
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Architecture

```
Frontend (Vue 3 + Vite)
  ├── Leaflet Map (OpenStreetMap, works in China)
  ├── Pinia Stores (auth, cons, theme)
  ├── i18n (Chinese/English)
  └── Responsive design

Backend (Express + Sequelize)
  ├── REST API
  ├── MySQL Database
  ├── JWT Authentication
  ├── FCC API Sync (daily cron)
  └── Extensible model system (JSON extra_fields)
```

## Feature Flags

In `config/app.config.js`:
```javascript
features: {
  showTestUsers: true,      // Show test data
  showTestCons: true,       // Show test conventions
  enableFCCSync: true,      // Sync from FCC database
  enableAnimations: true,   // UI animations
  enableTrajectories: true, // User travel lines on map
}
```

## FCC Sync

Automatically syncs convention data from [FurryConsCN](https://docs.furrycons.cn/docs/api/event/list).

Manual sync: `./deploy.sh sync-fcc`

## Future Extensions (Prepared)

- [ ] Active user list on homepage
- [ ] Furry meet statistics page
- [ ] Social features (follow users)
- [ ] Google/WeChat/QQ OAuth
- [ ] SMS login
- [ ] Push notifications for upcoming cons
- [ ] Photo galleries per con
- [ ] Hotel group booking coordination

## Database Schema

### Users
Core user info + OAuth links + privacy settings + extensible JSON fields

### Cons (Conventions)
Name, dates, location (with lat/lng), theme, poster, FCC sync ID

### Hotels
Name, address, coordinates

### UserCons (Junction)
Links users to cons with comments, ratings, visit order, extensible fields

### UserConHotels
Links user-con attendance to hotels with check-in/out dates
