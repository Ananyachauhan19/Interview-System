# 🚀 PRE-DEPLOYMENT SECURITY CHECKLIST

**CRITICAL:** Complete ALL items before production deployment

---

## ⚡ IMMEDIATE ACTIONS (Required Now)

### 1. Install Security Dependencies
```bash
cd backend
npm install
```

**Verify these packages are installed:**
- ✅ cookie-parser
- ✅ express-mongo-sanitize
- ✅ express-rate-limit
- ✅ helmet
- ✅ xss-clean

---

### 2. Generate Strong JWT Secret

**Current Risk:** Default/weak JWT secret = CRITICAL vulnerability

```bash
# Generate 64-byte random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Update backend/.env:**
```bash
JWT_SECRET=<paste-generated-secret-here>
```

**Verify:**
- ✅ At least 64 characters
- ✅ Random hexadecimal string
- ✅ NOT the example value
- ✅ NOT committed to git

---

### 3. Set Production Environment

**Update backend/.env:**
```bash
NODE_ENV=production
```

**Effect:**
- Hides detailed error messages from clients
- Enforces HTTPS for cookies
- Disables development-only features

---

### 4. Configure CORS

**Update backend/.env:**
```bash
FRONTEND_ORIGIN=https://your-actual-domain.com
```

**For multiple origins:**
```bash
FRONTEND_ORIGIN=https://domain1.com,https://domain2.com
```

**Verify:**
- ✅ Uses HTTPS (not HTTP) in production
- ✅ Matches actual frontend URL
- ✅ No trailing slashes

---

### 5. Enable HTTPS

**CRITICAL:** HttpOnly cookies require HTTPS in production

**Options:**
- Use reverse proxy (Nginx, Apache)
- Use SSL certificate (Let's Encrypt)
- Use cloud provider SSL (AWS, Azure, Vercel)

**Verify:**
- ✅ SSL certificate installed
- ✅ HTTP redirects to HTTPS
- ✅ Certificate not expired

---

## 🧪 TESTING BEFORE DEPLOYMENT

### Test 1: Authentication with Cookies
```bash
# Login and save cookie
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin@example.com","password":"YourPassword@123"}' \
  -c cookies.txt -v

# Should see: Set-Cookie: accessToken=...

# Use cookie for authenticated request
curl http://localhost:4000/api/auth/me -b cookies.txt

# Should return user info
```

**Expected:**
- ✅ Login returns user info (NO token in response)
- ✅ Cookie is set with HttpOnly flag
- ✅ Subsequent requests work with cookie

---

### Test 2: NoSQL Injection Protection
```bash
curl "http://localhost:4000/api/students/%7B%22%24ne%22%3Anull%7D"
```

**Expected:**
- ✅ Returns 400 or sanitized result
- ❌ Does NOT return all students

---

### Test 3: Rate Limiting
```bash
# Try 15 rapid login attempts
for i in {1..15}; do
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"identifier":"test","password":"wrong"}' \
    -w "\n%{http_code}\n"
done
```

**Expected:**
- ✅ First 10 attempts: 401 (Invalid credentials)
- ✅ Attempts 11-15: 429 (Rate limited)

---

### Test 4: Password Strength
```bash
# Try weak password
curl -X POST http://localhost:4000/api/auth/password/change \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"OldPass@123","newPassword":"weak","confirmPassword":"weak"}'
```

**Expected:**
- ✅ Returns 400 with validation errors
- ❌ Does NOT accept weak password

---

### Test 5: IDOR Protection
```bash
# Student A token accessing Student B data
curl -b cookies_studentA.txt \
  http://localhost:4000/api/students/STUDENT_B_ID/activity
```

**Expected:**
- ✅ Returns 403 Forbidden
- ❌ Does NOT return Student B's data

---

## 📋 CONFIGURATION CHECKLIST

### Backend Environment (.env)

```bash
# ✅ REQUIRED
NODE_ENV=production
JWT_SECRET=<64+ character hex string>
FRONTEND_ORIGIN=https://your-domain.com
MONGODB_URI=<your-database-connection>

# ✅ RECOMMENDED
BCRYPT_ROUNDS=12
LOG_LEVEL=info

# ✅ EMAIL CONFIGURATION
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<email>
SMTP_PASS=<app-password>
EMAIL_FROM=noreply@your-domain.com
```

**Verify:**
- ✅ No example/default values
- ✅ All secrets are strong and unique
- ✅ File is in .gitignore
- ✅ Backup stored securely

---

### Frontend Environment (.env)

```bash
VITE_API_BASE=https://api.your-domain.com/api
```

**Verify:**
- ✅ Uses HTTPS
- ✅ Matches backend URL
- ✅ No trailing slash on /api

---

## 🛡️ SECURITY VERIFICATION

### Startup Checks

When server starts, verify logs show:

```
[Security] MongoDB sanitization enabled
[Security] XSS protection enabled
[Security] Rate limiting active
[Security] Helmet security headers enabled
[Security] Cookie parser enabled
Environment: production
```

---

### Runtime Verification

**After deployment, test:**

1. **Login Flow**
   - ✅ Can login successfully
   - ✅ Cookie is set (check DevTools)
   - ✅ Can access protected routes
   - ✅ Can logout (cookie cleared)

2. **Authorization**
   - ✅ Students can access own data
   - ✅ Students CANNOT access other's data
   - ✅ Admins can access all data

3. **CSV Import**
   - ✅ Can import valid CSV
   - ✅ Formula fields are prefixed with '
   - ✅ No Excel code execution

4. **Password Reset**
   - ✅ Can request reset email
   - ✅ Reset link works once
   - ✅ Reset link expires (test after 15 min)
   - ✅ Old link invalid after password change

---

## ⚠️ PRE-FLIGHT WARNINGS

### DO NOT DEPLOY IF:

- ❌ Using default JWT_SECRET
- ❌ NODE_ENV is not "production"
- ❌ HTTPS is not configured
- ❌ Dependencies not installed
- ❌ Tests are failing
- ❌ CORS is set to allow all origins

### MUST HAVE:

- ✅ All dependencies installed
- ✅ Strong JWT secret configured
- ✅ HTTPS enabled
- ✅ Production environment set
- ✅ CORS properly configured
- ✅ Database connection working
- ✅ Email service configured
- ✅ Monitoring/logging active

---

## 🔍 POST-DEPLOYMENT MONITORING

### First 24 Hours

**Monitor:**
- Error rates (should be low)
- Failed login attempts (should be reasonable)
- Rate limit triggers (should be minimal)
- CPU/Memory usage (should be normal)

**Check Logs For:**
- `[SECURITY]` warnings
- `[ERROR]` messages
- Failed authentication attempts
- Unusual API access patterns

**Red Flags:**
- Many 401 errors (potential attack)
- Many 429 errors (rate limit abuse)
- Errors mentioning MongoDB operators
- Errors about cookies or CORS

---

## 📞 EMERGENCY ROLLBACK

**If critical issue detected:**

1. **Immediately:**
   ```bash
   # Stop the application
   pm2 stop all  # or docker-compose down
   ```

2. **Rollback to previous version:**
   ```bash
   git checkout <previous-commit>
   npm install
   npm start
   ```

3. **Investigate:**
   - Check error logs
   - Review recent changes
   - Identify root cause

4. **Fix and Redeploy:**
   - Apply hotfix
   - Test thoroughly
   - Deploy with monitoring

---

## ✅ DEPLOYMENT APPROVAL

**Sign off only when ALL items checked:**

### Pre-Deployment
- [ ] Dependencies installed (`npm install`)
- [ ] Strong JWT secret configured
- [ ] NODE_ENV=production
- [ ] HTTPS enabled and working
- [ ] CORS configured correctly
- [ ] All tests passing
- [ ] Staging environment tested

### Security Verification
- [ ] NoSQL injection blocked
- [ ] IDOR protection working
- [ ] CSV injection mitigated
- [ ] JWT in HttpOnly cookies
- [ ] Password reset secure
- [ ] Rate limiting active
- [ ] Error messages sanitized

### Operational Readiness
- [ ] Database connection verified
- [ ] Email service working
- [ ] Monitoring/alerting configured
- [ ] Logging enabled
- [ ] Backup strategy in place
- [ ] Rollback plan documented

### Team Readiness
- [ ] Team briefed on changes
- [ ] Support staff trained
- [ ] Incident response plan ready
- [ ] Documentation updated

---

**Approved By:** ___________________  
**Date:** ___________________  
**Time:** ___________________

---

## 🎯 SUCCESS CRITERIA

**Deployment is successful when:**

1. ✅ Users can login normally
2. ✅ No authentication errors
3. ✅ Security measures invisible to users
4. ✅ No functionality broken
5. ✅ Performance unchanged
6. ✅ Error logs normal
7. ✅ Security tests passing

**First 48 hours monitoring:**
- Monitor error rates
- Watch for security alerts
- Track user feedback
- Review access logs
- Verify backup integrity

---

**Need Help?** Review `SECURITY_FIXES_COMPLETE.md` for detailed information.
