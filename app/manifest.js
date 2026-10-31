export const dynamic = 'force-static';

// PWA manifest: lets people "Add to Home screen" on mobile.
export default function manifest() {
  return {
    name: 'Resume Reviewer Pro',
    short_name: 'ResumeReviewer',
    description: 'Agentic AI resume analyzer with ATS score, rewrite, cover letter and career assistant.',
    start_url: '.',
    display: 'standalone',
    background_color: '#070b14',
    theme_color: '#070b14',
    icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
