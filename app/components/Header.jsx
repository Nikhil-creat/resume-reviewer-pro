'use client';
import { useEffect, useState } from 'react';
import { Menu, X, Github, Sparkles } from 'lucide-react';

const LINKS = [
  ['Analyzer', '#analyzer'],
  ['Features', '#features'],
  ['How it works', '#pipeline'],
  ['Security', '#security'],
  ['Stack', '#stack'],
  ['FAQ', '#faq'],
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header className={`hdr ${scrolled ? 'hdr-scrolled' : ''}`}>
      <div className="container hdr-in">
        <a href="#top" className="brand" aria-label="Resume Reviewer Pro home">
          <span className="brand-mark"><Sparkles size={16} /></span>
          <span>Resume<b>Reviewer</b> <em>Pro</em></span>
        </a>

        <nav className="nav" aria-label="Primary">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </nav>

        <div className="hdr-cta">
          <a className="btn btn-ghost btn-sm" href="https://github.com/Nikhil-creat/resume-reviewer-pro" target="_blank" rel="noopener noreferrer">
            <Github size={15} /> <span className="hide-sm">GitHub</span>
          </a>
          <a className="btn btn-primary btn-sm" href="#analyzer">Scan my resume</a>
          <button className="icon-btn menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="mnav">
          {LINKS.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
          ))}
        </div>
      )}
    </header>
  );
}
