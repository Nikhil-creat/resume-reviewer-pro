import { Github, Linkedin, Instagram, Sparkles, ShieldCheck } from 'lucide-react';
import { API_BASE } from '../../lib/api';

export default function Footer() {
  return (
    <footer className="ftr">
      <div className="container ftr-grid">
        <div>
          <a href="#top" className="brand">
            <span className="brand-mark"><Sparkles size={16} /></span>
            <span>Resume<b>Reviewer</b> <em>Pro</em></span>
          </a>
          <p className="muted ftr-blurb">
            Agentic AI resume analyzer with ATS scoring, keyword gaps, truthful rewrites, cover letters, a CNN layout check and a RAG career assistant.
          </p>
          <div className="social">
            <a href="https://github.com/Nikhil-creat" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><Github size={18} /></a>
            <a href="https://in.linkedin.com/in/nikhil-chary-sriramoju-95041b38a" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><Linkedin size={18} /></a>
            <a href="https://www.instagram.com/nikhil__sriramoju" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={18} /></a>
          </div>
        </div>

        <div>
          <h4>Product</h4>
          <a href="#analyzer">Analyzer</a>
          <a href="#features">Features</a>
          <a href="#pipeline">How it works</a>
          <a href="#faq">FAQ</a>
        </div>

        <div>
          <h4>Trust</h4>
          <a href="#security">Security</a>
          <a href="#security">Limitations</a>
          <a href="#stack">Tech stack</a>
          <a href={`${API_BASE}/api/health`}>System status</a>
        </div>

        <div>
          <h4>Project</h4>
          <a href="https://github.com/Nikhil-creat/resume-reviewer-pro" target="_blank" rel="noopener noreferrer">Source code</a>
          <a href="https://github.com/Nikhil-creat/resume-reviewer-pro/issues" target="_blank" rel="noopener noreferrer">Report an issue</a>
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Get a Gemini key</a>
          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">Get a Groq key</a>
        </div>
      </div>

      <div className="container ftr-bot">
        <span>© {new Date().getFullYear()} Resume Reviewer Pro · Built by <a href="https://github.com/Nikhil-creat" target="_blank" rel="noopener noreferrer">Nikhil Chary Sriramoju</a></span>
        <span className="row"><ShieldCheck size={14} /> Your data is not stored</span>
      </div>
    </footer>
  );
}
