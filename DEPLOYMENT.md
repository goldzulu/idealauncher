# Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure all required environment variables are set in Vercel dashboard:

- `NEXTAUTH_SECRET` - Random string for NextAuth.js encryption
- `NEXTAUTH_URL` - Production URL (https://your-app.vercel.app)
- `DATABASE_URL` - PostgreSQL connection string
- `AZURE_OPENAI_API_KEY` - Azure OpenAI service key
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint URL
- `AZURE_OPENAI_DEPLOYMENT_NAME` - Model deployment name (default: gpt-4)
- `DOMAINR_API_KEY` - Domainr API key for domain checking

### 2. Database Setup
1. Ensure PostgreSQL database is provisioned and accessible
2. Run database migrations: `npm run db:migrate`
3. Verify database connection and schema

### 3. Testing
Run complete test suite before deployment:
```bash
# Unit and integration tests
npm run test

# End-to-end tests
npm run test:e2e

# All tests
npm run test:all
```

### 4. Build Verification
```bash
# Test production build locally
npm run build
npm run start
```

### 5. Security Checklist
- [ ] All API routes have proper authentication
- [ ] Database queries use parameterized statements
- [ ] Environment variables are properly secured
- [ ] CORS is configured correctly
- [ ] Rate limiting is in place for AI endpoints

## Deployment Steps

### Vercel Deployment

1. **Connect Repository**
   - Link GitHub repository to Vercel
   - Configure auto-deployment from main branch

2. **Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Ensure production values are different from development

3. **Build Settings**
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm ci`

4. **Domain Configuration**
   - Set up custom domain if needed
   - Configure DNS records
   - Enable HTTPS (automatic with Vercel)

5. **Database Migration**
   - Run migrations against production database
   - Verify schema matches expectations

### Post-Deployment Verification

1. **Functional Testing**
   - [ ] Authentication flow works
   - [ ] Idea creation and management
   - [ ] Chat functionality with AI
   - [ ] Document editing and auto-save
   - [ ] Research panel features
   - [ ] Scoring system
   - [ ] MVP planning
   - [ ] Export functionality

2. **Performance Testing**
   - [ ] Page load times < 3 seconds
   - [ ] API response times < 500ms
   - [ ] AI streaming responses work smoothly
   - [ ] Database queries are optimized

3. **Error Monitoring**
   - Set up error tracking (Sentry recommended)
   - Monitor API error rates
   - Check database connection stability

## Monitoring and Maintenance

### Key Metrics to Monitor
- Response times for API endpoints
- AI service usage and costs
- Database performance and connection pool
- User authentication success rates
- Error rates and types

### Regular Maintenance Tasks
- Monitor AI service costs and usage
- Review and optimize database queries
- Update dependencies regularly
- Backup database regularly
- Monitor security vulnerabilities

### Scaling Considerations
- Database connection pooling
- AI request rate limiting
- CDN for static assets
- Database read replicas if needed

## Rollback Plan

In case of deployment issues:

1. **Immediate Rollback**
   - Use Vercel's instant rollback feature
   - Revert to previous working deployment

2. **Database Rollback**
   - Have database backup ready
   - Prepare rollback migration scripts
   - Test rollback procedure in staging

3. **Communication Plan**
   - Notify users of any downtime
   - Provide status updates
   - Document issues and resolutions

## Environment-Specific Configurations

### Production
- Enable error tracking
- Use production database
- Enable performance monitoring
- Configure proper logging levels

### Staging
- Use staging database
- Enable debug logging
- Test with production-like data
- Validate all integrations

### Development
- Use local database
- Enable hot reloading
- Use development AI keys
- Enable detailed error messages