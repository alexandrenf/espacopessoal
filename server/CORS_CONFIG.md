# CORS Configuration Guide

## 🌐 What is CORS?

CORS (Cross-Origin Resource Sharing) is a security mechanism that allows web applications from one domain to access resources from another domain. For WebSocket connections, proper CORS configuration is essential.

## 🛠️ Current Configuration

Your server now supports flexible CORS configuration through environment variables:

### Environment Variable Setup

```env
# Single origin
CORS_ORIGIN=https://docs.espacopessoal.com

# Multiple origins (comma-separated)
CORS_ORIGIN=https://docs.espacopessoal.com,https://espacopessoal-v2.vercel.app,https://www.espacopessoal.com

# Development (allows local development)
CORS_ORIGIN=https://docs.espacopessoal.com,http://localhost:3000,http://localhost:3001

# All origins (NOT recommended for production)
CORS_ORIGIN=*
```

## 🔧 Configuration Options

### Production Setup (Recommended)

```env
# Production Environment
NODE_ENV=production
CORS_ORIGIN=https://docs.espacopessoal.com,https://espacopessoal-v2.vercel.app

# Additional security headers
CORS_CREDENTIALS=true
CORS_MAX_AGE=86400
```

### Development Setup

```env
# Development Environment
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,https://docs.espacopessoal.com

# More permissive for development
CORS_CREDENTIALS=true
```

### Staging Setup

```env
# Staging Environment
NODE_ENV=staging
CORS_ORIGIN=https://staging.espacopessoal.com,https://espacopessoal-v2.vercel.app

CORS_CREDENTIALS=true
```

## 🚀 Deployment-Specific Settings

### Coolify Configuration

In your Coolify service, set these environment variables:

```env
PORT=6001
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGIN=https://docs.espacopessoal.com,https://espacopessoal-v2.vercel.app
```

### Vercel Configuration

For your client on Vercel, ensure these environment variables are set:

```env
NEXT_PUBLIC_WS_URL=wss://socket.espacopessoal.com:6001
NEXT_PUBLIC_WS_HOST=socket.espacopessoal.com
NEXT_PUBLIC_WS_PORT=6001
```

## 🔍 Testing CORS

### Check Browser Console

1. Open your client application in browser
2. Open Developer Tools (F12)
3. Check Console tab for CORS errors
4. Check Network tab for WebSocket connections

### Expected Behavior

✅ **Success**: WebSocket connection established  
✅ **Console**: "WebSocket connected successfully!"  
✅ **Network**: WSS connection (green status)  

❌ **Error**: "Mixed Content" or "CORS policy"  
❌ **Console**: Connection refused  
❌ **Network**: Connection failed  

## 🛡️ Security Best Practices

### 1. Specific Origins Only

```env
# ✅ Good - Specific domains
CORS_ORIGIN=https://docs.espacopessoal.com,https://espacopessoal-v2.vercel.app

# ❌ Bad - Wildcard in production
CORS_ORIGIN=*
```

### 2. HTTPS Only in Production

```env
# ✅ Good - HTTPS only
CORS_ORIGIN=https://docs.espacopessoal.com

# ❌ Bad - HTTP in production
CORS_ORIGIN=http://docs.espacopessoal.com
```

### 3. Environment-Specific Configuration

```env
# ✅ Good - Different settings per environment
NODE_ENV=production
CORS_ORIGIN=https://docs.espacopessoal.com

# ❌ Bad - Same settings everywhere
CORS_ORIGIN=*
```

## 🐛 Troubleshooting

### Common Issues

1. **Mixed Content Error**
   - Solution: Use WSS instead of WS
   - Check: `NEXT_PUBLIC_WS_URL=wss://...`

2. **CORS Policy Error**
   - Solution: Add your domain to CORS_ORIGIN
   - Check: Server logs for rejected origins

3. **Connection Refused**
   - Solution: Verify server is running and accessible
   - Check: Port forwarding and firewall settings

4. **SSL Certificate Issues**
   - Solution: Ensure valid SSL certificate for WSS
   - Check: Certificate validity and domain matching

### Debug Commands

```bash
# Check server logs
bun run start

# Test WebSocket connection
wscat -c wss://socket.espacopessoal.com:6001

# Check CORS headers
curl -H "Origin: https://docs.espacopessoal.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://socket.espacopessoal.com:6001
```

## 📝 Environment Files

### Server (.env)
```env
CORS_ORIGIN=https://docs.espacopessoal.com,https://espacopessoal-v2.vercel.app
```

### Client (.env.local)
```env
NEXT_PUBLIC_WS_URL=wss://socket.espacopessoal.com:6001
```

## 🔄 Updating CORS Settings

1. Update environment variables in your deployment platform
2. Restart the server service
3. Clear browser cache
4. Test the connection

Remember: CORS changes require server restart to take effect! 