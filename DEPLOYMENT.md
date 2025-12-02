# Reputation Buddy - Deployment Guide

## Quick Deployment Steps

### 1. Deploy Frontend to Vercel

#### Option A: Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New" → "Project"
3. Import `raullee/reputation-buddy` from GitHub
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL`: Your backend API URL (add after backend deployment)
6. Click "Deploy"

#### Option B: Vercel CLI
```bash
cd frontend
npx vercel --prod
```

### 2. Deploy Backend to Railway

#### Railway Dashboard Deployment
1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `raullee/reputation-buddy`
4. Railway will auto-detect the backend
5. Add a PostgreSQL database:
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically set `DATABASE_URL`
6. Add a Redis database:
   - Click "New" → "Database" → "Add Redis"
   - Railway will automatically set `REDIS_URL`
7. Configure environment variables in Railway dashboard:
   ```
   NODE_ENV=production
   PORT=3001
   CLIENT_URL=https://your-vercel-app.vercel.app

   # Copy from .env.example and fill in your keys:
   JWT_SECRET=...
   STRIPE_SECRET_KEY=...
   OPENAI_API_KEY=...
   ANTHROPIC_API_KEY=...
   TWILIO_ACCOUNT_SID=...
   TWILIO_AUTH_TOKEN=...
   GOOGLE_PLACES_API_KEY=...
   ```
8. Set root directory to `backend` in Settings
9. Deploy

### 3. Alternative: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign in
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: reputation-buddy-api
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
5. Add PostgreSQL database:
   - Click "New" → "PostgreSQL"
   - Note the Internal Database URL
6. Add Redis instance:
   - Click "New" → "Redis"
   - Note the Internal Redis URL
7. Add environment variables (same as above)

### 4. Update Frontend with Backend URL

After backend deployment:
1. Go to Vercel dashboard
2. Navigate to your project → Settings → Environment Variables
3. Update `NEXT_PUBLIC_API_URL` with your backend URL
4. Redeploy frontend

### 5. Configure Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Endpoint URL: `https://your-backend-url.railway.app/api/webhooks/stripe`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy webhook signing secret and add to backend env vars as `STRIPE_WEBHOOK_SECRET`

## Repository Structure

```
reputation-buddy/
├── backend/          # Node.js/Express API
│   ├── src/
│   ├── prisma/
│   └── package.json
├── frontend/         # Next.js App
│   ├── src/
│   ├── public/
│   └── package.json
└── README.md
```

## Environment Variables Summary

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
```

### Backend
All required environment variables are listed in `backend/.env.example`

## Post-Deployment Checklist

- [ ] Frontend deployed and accessible
- [ ] Backend deployed and accessible
- [ ] PostgreSQL database connected
- [ ] Redis connected
- [ ] All environment variables configured
- [ ] Stripe webhook configured
- [ ] Test user registration
- [ ] Test login
- [ ] Test dashboard access
- [ ] Verify API endpoints working

## Monitoring

- **Frontend**: Check Vercel deployment logs
- **Backend**: Check Railway/Render logs
- **Database**: Monitor in Railway/Render dashboard
- **Errors**: Configure Sentry (optional)

## Troubleshooting

### Build Failures
- Check Node.js version (should be 18+)
- Verify all dependencies in package.json
- Check build logs for specific errors

### API Connection Issues
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS configuration in backend
- Ensure backend is deployed and running

### Database Issues
- Verify `DATABASE_URL` is set correctly
- Run migrations: `npx prisma migrate deploy`
- Check database connection in backend logs

## Scaling

### Frontend
- Vercel automatically scales
- No additional configuration needed

### Backend
- Railway: Increase resources in dashboard
- Render: Upgrade to higher tier plan
- Consider adding load balancer for multiple instances

## Cost Estimates

### Free Tier Deployment
- **Vercel**: Free (hobby plan)
- **Railway**: $5/month (500 hours free trial)
- **PostgreSQL**: Included with Railway
- **Redis**: Included with Railway
- **Total**: ~$5/month

### Production Deployment
- **Vercel**: $20/month (pro plan)
- **Railway**: $20-50/month (depending on usage)
- **Database**: Included
- **APIs**: $50-200/month (OpenAI, Twilio, etc.)
- **Total**: ~$90-270/month

## Support

For issues:
1. Check deployment logs
2. Verify environment variables
3. Review error messages
4. Check GitHub repository for updates

---

**Repository**: https://github.com/raullee/reputation-buddy
**Last Updated**: December 2025
