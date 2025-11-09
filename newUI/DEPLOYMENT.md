# Deployment Guide

## Overview

The new UI for CLI Agent Orchestrator is a standalone React application that communicates with the backend API via WebSocket and HTTP requests.

## Prerequisites

- Node.js 18+
- The CLI Agent Orchestrator backend server running on `http://127.0.0.1:9889`

## Quick Start

### Development

```bash
cd newUI
npm install
npm run dev
```

The development server will start on `http://localhost:3001` and automatically proxy API requests to the backend.

### Production

```bash
cd newUI
npm install
npm run build
npm run preview
```

The production build will be available and can be served by any static web server.

## Configuration

### Environment Variables

Create a `.env.production` file for production:

```env
VITE_API_URL=http://your-backend-server:9889
VITE_WS_URL=ws://your-backend-server:9889/ws
```

### Backend Integration

The UI expects the following backend endpoints:

- **REST API**: `/api/*` → proxied to `http://127.0.0.1:9889/*`
- **WebSocket**: `/ws` → proxied to `ws://127.0.0.1:9889/ws`

## Docker Deployment

Option 1: Build with Dockerfile

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Option 2: Use existing image

```bash
docker run -p 3001:80 \
  -e VITE_API_URL=http://backend:9889 \
  your-cao-ui-image
```

## Nginx Configuration

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://backend:9889/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Proxy
    location /ws {
        proxy_pass http://backend:9889;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Production Considerations

### Security

1. **HTTPS**: Use HTTPS in production
2. **CORS**: Configure backend CORS settings
3. **Authentication**: Add authentication middleware if needed
4. **Rate Limiting**: Implement rate limiting on the backend

### Performance

1. **Caching**: Enable browser caching for static assets
2. **CDN**: Use a CDN for better performance
3. **Compression**: Enable gzip compression
4. **Monitoring**: Monitor API response times and WebSocket connections

### Monitoring

The UI includes built-in monitoring for:

- WebSocket connection status
- API response times
- Error rates
- User interactions

Monitor these metrics for production health.

### Backup

Since this is a stateless frontend, no backup is needed. However, ensure:

- Backend data is backed up regularly
- Configuration is version controlled
- Build artifacts are reproducible

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check backend server status
   - Verify firewall settings
   - Check CORS configuration

2. **API Requests Failing**
   - Verify backend URL configuration
   - Check network connectivity
   - Review browser console for errors

3. **Build Failures**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Review build logs for specific errors

### Logs

Check browser console for:
- WebSocket connection errors
- API request failures
- JavaScript errors

Check backend logs for:
- API errors
- WebSocket connection issues
- Database problems

## Updates

To update the UI:

1. Update dependencies: `npm update`
2. Review breaking changes in dependencies
3. Test thoroughly in development
4. Build and deploy: `npm run build`
5. Monitor for issues after deployment

## Support

For issues or questions:

1. Check the browser console for JavaScript errors
2. Verify backend connectivity
3. Review network requests in browser dev tools
4. Check this documentation for known issues