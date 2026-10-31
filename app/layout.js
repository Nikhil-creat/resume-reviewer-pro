import './globals.css';
import { AppProvider } from './components/AppContext';

export const metadata = {
  title: 'Resume Reviewer Pro — Agentic AI ATS Resume Analyzer',
  description:
    'Multi-agent AI resume analyzer: recruiter-grade ATS score, keyword gaps, a 95%+ optimized rewrite, a tailored cover letter, a CNN layout check and a RAG career assistant. Built with Next.js, Groq and Gemini.',
  keywords: ['resume analyzer', 'ATS score', 'agentic AI', 'RAG', 'cover letter generator', 'Next.js', 'Groq', 'Gemini'],
  authors: [{ name: 'Nikhil Chary Sriramoju', url: 'https://github.com/Nikhil-creat' }],
  openGraph: {
    title: 'Resume Reviewer Pro',
    description: 'Agentic AI resume analyzer with ATS score, rewrite, cover letter and career assistant.',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#070b14',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
