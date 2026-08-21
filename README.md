# Resume Reviewer Pro — Deploy Guide

## 1. Get a Google Gemini API key (free)
- Go to https://aistudio.google.com/apikey
- Sign in with your Google account
- Click "Create API Key"
- Copy it (you'll need it in step 4)

This uses Google's free tier — no credit card required. Free tier has rate
limits (requests per minute/day), which is fine for personal/testing use.

## 2. Push this project to GitHub
(Skip if you've already done this.)
```
git init
git add .
git commit -m "Resume Reviewer Pro"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 3. Deploy on Vercel
- Go to https://vercel.com → sign in with GitHub
- Click "Add New Project" → import the repo you just pushed
- Framework preset: Next.js (auto-detected, leave as is)
- Don't click Deploy yet — go to step 4 first

## 4. Add your API key
- On the "Configure Project" screen (or later in Project → Settings → Environment Variables):
  - Name: `GOOGLE_API_KEY`
  - Value: the key you copied in step 1
  - Apply to: Production, Preview, Development (all)
- Click Deploy (or, if already deployed, go to Deployments → "..." → Redeploy)

## 5. Done
- Vercel gives you a live URL like `your-project.vercel.app`
- Open it, upload a resume (PDF/DOCX/JPG/PNG) or paste text, add a job description, and run the scan

## Local testing (optional, before deploying)
```
npm install
cp .env.local.example .env.local
# paste your key into .env.local
npm run dev
```
Then open http://localhost:3000

## Notes
- Model used: `gemini-3.6-flash`. You can change this in `app/api/analyze/route.js` if needed.
- Your API key stays server-side (inside `app/api/analyze/route.js`) — it is never exposed to the browser.
- Free tier has rate limits — if you hit them, wait a bit or check quota at https://aistudio.google.com
