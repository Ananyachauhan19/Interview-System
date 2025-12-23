# 🚨 CRITICAL: Pre-Production Security Checklist

## ⚠️ DO THESE BEFORE DEPLOYING TO PRODUCTION

### 1. Remove .env from Git History
```bash
cd backend
git rm --cached src/.env
git commit -m "Remove sensitive .env file"
git push origin main

# Verify it's gone:
git log --all --full-history -- "*/.env"
```

### 2. Generate Strong JWT Secret
```bash
# Generate a secure 64-character secret:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copy the output and set in production .env
```

### 3. Rotate ALL Secrets
After removing .env from git, immediately change:
- [ ] MongoDB password → Update MONGODB_URI
- [ ] JWT_SECRET → Use generated strong secret
- [ ] Supabase keys → Generate new from dashboard
- [ ] Cloudinary credentials → Rotate in dashboard
- [ ] SMTP password → Generate new app password

### 4. Set Production Environment Variables
Create `.env` in backend root (NOT in src/):
```bash
NODE_ENV=production
PORT=4000

# Frontend
FRONTEND_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Database - NEW PASSWORD
MONGODB_URI=mongodb+srv://user:NEW_PASSWORD@...

# JWT - STRONG SECRET (min 64 chars)
JWT_SECRET=<paste-generated-secret-here>
JWT_EXPIRES_IN=7d

# Admin - CHANGE THESE
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-unique-password>

# Supabase - NEW KEYS
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=<new-key>
SUPABASE_SERVICE_KEY=<new-key>

# Cloudinary - NEW CREDENTIALS
CLOUDINARY_CLOUD_NAME=<your-cloud>
CLOUDINARY_API_KEY=<new-key>
CLOUDINARY_API_SECRET=<new-secret>

# Email - NEW APP PASSWORD
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=youremail@gmail.com
SMTP_PASS=<new-app-password>
MAIL_FROM=youremail@gmail.com
```

### 5. Install Security Dependencies
```bash
cd backend
npm install express-rate-limit express-mongo-sanitize helmet xss-clean winston --save
```

### 6. Verify Application Starts
```bash
npm start

# Should see:
# ✅ API listening on port 4000
# ✅ Socket.IO ready
# ✅ No JWT_SECRET warnings
# ✅ No errors
```

### 7. Test Critical Flows
- [ ] Login works (admin, coordinator, student)
- [ ] Password reset works
- [ ] File upload works
- [ ] WebSocket connects
- [ ] Rate limiting triggers (test with rapid requests)
- [ ] Logs directory created (`backend/logs/`)

---

## 📊 Quick Security Checklist

| Security Control | Status | Notes |
|-----------------|--------|-------|
| Rate limiting | ✅ | All routes protected |
| Input sanitization | ✅ | NoSQL injection blocked |
| XSS protection | ✅ | All inputs cleaned |
| JWT expiration | ✅ | 7 days default |
| Strong JWT secret | ⚠️ | Must set in production |
| Security headers | ✅ | Helmet configured |
| Error sanitization | ✅ | No info leaks in prod |
| Auth logging | ✅ | All attempts logged |
| WebSocket auth | ✅ | JWT required |
| Graceful shutdown | ✅ | SIGTERM handled |
| .env protected | ⚠️ | Must remove from git history |
| CORS configured | ✅ | Environment-based |

---

## 🔒 Security Features Active

### Rate Limits (per IP):
- Login: 10 attempts / 15 min
- Password reset: 5 requests / 1 hour
- File upload: 10 uploads / 15 min
- Bulk operations: 20 ops / 1 hour
- API calls: 500 requests / 15 min
- Feedback: 50 submissions / 1 hour

### Input Protection:
- ✅ NoSQL injection blocked
- ✅ XSS payloads sanitized
- ✅ 2MB body size limit
- ✅ File type validation (multer)

### Authentication:
- ✅ JWT tokens (7 day expiry)
- ✅ Bcrypt password hashing
- ✅ Secure password reset flow
- ✅ Auth attempt logging

### Monitoring:
- ✅ `logs/security.log` - Auth events
- ✅ `logs/errors.log` - Application errors
- ✅ Console warnings for suspicious activity

---

## 🚀 Deployment Commands

### Development:
```bash
cd backend
npm install
npm run dev
```

### Production:
```bash
# Set environment
export NODE_ENV=production

# Start server
cd backend
npm install --production
npm start

# Or with PM2:
pm2 start src/server.js --name interview-api
pm2 logs interview-api
```

---

## 🔍 Monitoring Commands

### Check Security Logs:
```bash
# Recent security events:
tail -f backend/logs/security.log

# Recent errors:
tail -f backend/logs/errors.log

# Search for failed login attempts:
grep "AUTH_FAILURE" backend/logs/security.log

# Count rate limit violations:
grep "Rate limit exceeded" backend/logs/security.log | wc -l
```

### Check Application Health:
```bash
# Health check:
curl http://localhost:4000/api/health

# Should return:
# {"ok":true}
```

---

## ⚠️ Common Issues & Fixes

### "JWT_SECRET must be set to a strong value"
**Problem:** JWT_SECRET is weak or missing  
**Fix:** 
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Add output to .env as JWT_SECRET
```

### "Cannot find module 'express-rate-limit'"
**Problem:** Security dependencies not installed  
**Fix:**
```bash
cd backend
npm install
```

### "EADDRINUSE: port 4000 already in use"
**Problem:** Another process using port 4000  
**Fix:**
```bash
# Find and kill process:
lsof -ti:4000 | xargs kill -9
# Or change PORT in .env
```

### Rate limit blocking legitimate users
**Problem:** User hitting rate limit during normal use  
**Fix:** Increase limits in `middleware/rateLimiter.js`
```javascript
// Example: Increase login limit
max: 20,  // was 10
```

---

## 📞 Emergency Contacts

### Security Incident Response:
1. Check `logs/security.log` for attack patterns
2. Identify attacker IP addresses
3. Block at infrastructure level (firewall/WAF)
4. Rotate compromised credentials
5. Review access logs for data breach

### Log Locations:
- Security events: `backend/logs/security.log`
- Application errors: `backend/logs/errors.log`
- Console output: PM2 logs or server console

---

## ✅ Production Deployment Checklist

Before going live:
- [ ] .env removed from git history
- [ ] All secrets rotated (DB, JWT, APIs)
- [ ] Strong JWT_SECRET set (64+ chars)
- [ ] NODE_ENV=production
- [ ] CORS origin set to production domain
- [ ] Dependencies installed
- [ ] Application starts without errors
- [ ] Health check responds
- [ ] Login works
- [ ] Logs directory created
- [ ] SSL/TLS certificate configured
- [ ] Firewall rules configured
- [ ] Monitoring alerts set up
- [ ] Backup strategy in place

---

## 🎯 Success Criteria

Your application is production-ready when:
- ✅ No warnings about JWT_SECRET
- ✅ Rate limiting triggers on abuse attempts
- ✅ Security logs show auth events
- ✅ Error logs don't expose stack traces
- ✅ WebSocket requires authentication
- ✅ Application recovers from crashes gracefully
- ✅ Health endpoint responds

---

*Keep this document handy during deployment*  
*Last Updated: December 23, 2025*
