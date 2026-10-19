# Deploy guide: GitHub then Vercel

## A. Put the files in your GitHub repo
**Option 1: Phone, Termux (works with folders)**
```
termux-setup-storage
pkg install git unzip
cd ~
git clone https://github.com/Nikhil-creat/resume-reviewer-pro
cd resume-reviewer-pro
unzip -o ~/storage/downloads/resume-reviewer-pro-upgrade.zip
git add .
git commit -m "Master upgrade: agents, RAG, Groq fallback, cover letters"
git push
```
When asked for a password, paste a GitHub Personal Access Token (GitHub > Settings > Developer settings > Tokens (classic) > scope "repo").

**Option 2: Laptop, GitHub website**
Unzip, open your repo, Add file > Upload files, drag the folders `app`, `lib`, `public` plus `DEPLOY.md`, then Commit changes.

## B. Vercel
1. Your project is already linked to the repo, so every push redeploys automatically (check Deployments).
2. Project > Settings > Environment Variables. Add for Production, Preview and Development:
   - `GOOGLE_API_KEY` (already there)
   - `GROQ_API_KEY` from https://console.groq.com/keys (secondary provider)
   - Optional: `GEMINI_MODEL`, `GROQ_MODEL` (default llama-3.3-70b-versatile)
3. Deployments > latest > ... > Redeploy so the new variables apply.
4. Optional: Project > Analytics > Enable (the page already includes the script).

## C. Test
- `/api/health` shows which providers are configured.
- `/master.html` is the full site. Try Load sample, Analyze, Deep AI, and the Cover letter generator.

## D. Make it the home page (optional)
In `next.config.js` add:
```js
async rewrites() { return { beforeFiles: [{ source: "/", destination: "/master.html" }] }; },
```
inside the exported config object.

## Safety
Never put keys in code or commit `.env.local`. Keys live only in Vercel settings. If a key was ever pasted in chat or committed, regenerate it.
