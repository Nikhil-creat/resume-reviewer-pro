# Publish from your phone: Termux → GitHub → GitHub Pages (+ Vercel backend)

GitHub Pages serves **static files only**, so the setup is split in two:

| Part | Where | What it does |
|---|---|---|
| Website (UI) | **GitHub Pages** `https://nikhil-creat.github.io/resume-reviewer-pro/` | The pages, header, footer, analyzer screen |
| Backend (AI API) | **Vercel** `https://<your-project>.vercel.app` | `/api/analyze`, `/api/chat`; holds your Groq and Gemini keys |

Your API keys never go on GitHub Pages or into the repo.

## Quick way: one command

After saving the zip to your phone's Downloads (and running `termux-setup-storage` once):

```bash
(rm -rf ~/rrp-new && unzip -q ~/storage/downloads/resume-reviewer-pro-final.zip -d ~/rrp-new
bash ~/rrp-new/resume-reviewer-pro/termux-deploy.sh)
```

The script installs tools, asks for your GitHub email, logs you in through the browser, enables Pages,
stores your Vercel URL as `API_BASE`, replaces the repo contents, pushes and triggers the Pages build.

Common mistakes:
- Use the browser login, not "Paste an authentication token". A token needs the scopes `repo`, `read:org` and `workflow`, otherwise you get "missing required scope".
- Never type the placeholder `YOUR_GITHUB_EMAIL`; put your real email. Fix a saved placeholder with `git config --global user.email "you@example.com"`.
- Paste one command at a time. Pasting several lines together joins them (as happened in your screenshot).

The manual steps below do the same thing.

---

## 1. Set up Termux

Install Termux from **F-Droid** (the Play Store build is outdated).

```bash
pkg update -y && pkg upgrade -y
pkg install -y git gh unzip
termux-setup-storage        # tap "Allow" so Termux can read your Downloads folder
```

## 2. Unzip the project

Save `resume-reviewer-pro-master.zip` to your phone's Downloads, then:

```bash
cd ~
unzip -o ~/storage/downloads/resume-reviewer-pro-master.zip -d ~/rrp-new
ls ~/rrp-new            # you should see one folder: resume-reviewer-pro
```

## 3. Log in to GitHub

```bash
git config --global user.name  "Nikhil Chary Sriramoju"
git config --global user.email "your-github-email@example.com"
gh auth login
```

Choose: **GitHub.com → HTTPS → Yes (authenticate Git) → Login with a web browser**.
Copy the one-time code, open `https://github.com/login/device` in your phone browser, paste the code, approve.

```bash
gh auth status          # should say "Logged in to github.com"
```

## 4. Put the files into your repo

```bash
cd ~
git clone https://github.com/Nikhil-creat/resume-reviewer-pro.git repo
cd repo
# remove the old files but keep the .git folder
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
# copy the new project in (the trailing /. also copies dotfiles like .github)
cp -r ~/rrp-new/resume-reviewer-pro/. .
ls -a                   # check .github, app, lib, cnn-service ... are present
git add -A
git commit -m "v2: agentic AI, RAG, CNN, Docker, Pages workflow"
git push origin main
```

Never run `git add` on a file containing your API keys. `.env.local` is already in `.gitignore`.

## 5. Deploy the backend on Vercel (browser, no commands)

1. Open `vercel.com` → sign in with GitHub → **Add New Project** → import `resume-reviewer-pro`.
2. Framework: Next.js (auto). Before deploying, add **Environment Variables**:
   - `GROQ_API_KEY` = your key from `console.groq.com/keys`
   - `GEMINI_API_KEY` = your key from `aistudio.google.com/apikey`
   - `ALLOWED_ORIGINS` = `https://nikhil-creat.github.io`
3. Deploy. Open `https://<your-project>.vercel.app/api/health`. You should see `"mode":"live"`.

(Your repo currently shows failed "Production" deployments. If Vercel fails again, open the deployment log, scroll to the red error line, and send it to me.)

## 6. Turn on GitHub Pages

On github.com (use "Desktop site" in your mobile browser):

1. Repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Repo → **Settings → Secrets and variables → Actions → Variables tab → New repository variable**:
   - Name: `API_BASE`
   - Value: `https://<your-project>.vercel.app` (no trailing slash)
3. Repo → **Actions → "Deploy to GitHub Pages" → Run workflow**.
4. When it turns green, open `https://nikhil-creat.github.io/resume-reviewer-pro/`.

## Updating later

```bash
cd ~/repo
# edit files, then:
git add -A && git commit -m "update" && git push
```
Every push to `main` redeploys Pages automatically.

## Troubleshooting

| Problem | Fix |
|---|---|
| Page loads but scan says "Cannot reach the backend" | `API_BASE` variable missing/wrong, or Vercel not deployed. Re-run the Pages workflow after fixing. |
| Scan fails with a CORS error | On Vercel set `ALLOWED_ORIGINS=https://nikhil-creat.github.io` (exact, no trailing slash) and redeploy. |
| Page is unstyled or blank | Pages Source must be **GitHub Actions**; the workflow sets the `/resume-reviewer-pro` base path from the repo name. |
| `git push` asks for a password | Run `gh auth setup-git`, or `gh auth login` again. |
| `permission denied` reading Downloads | Run `termux-setup-storage` again and allow storage. |
| Vercel scan times out | Free plans cap function time. Try a shorter resume/job description. |

## No Vercel? Offline-only Pages demo

Skip step 5 and leave `API_BASE` unset: the UI loads but scans will not work, because Pages cannot run the backend.
