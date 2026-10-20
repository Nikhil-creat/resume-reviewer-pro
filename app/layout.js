import "./globals.css";

export const metadata = {
  title: "Resume Reviewer Pro | Agentic ATS analyzer and builder",
  description: "Upload your resume, get an explainable 100-point ATS score, an agent-rewritten truthful version and ATS-safe PDF/DOCX downloads. Built with Next.js, RAG, CNN layout analysis and Groq / Gemini.",
  openGraph: { title: "Resume Reviewer Pro", description: "Agentic ATS resume analyzer with no-fabrication guard.", type: "website" }
};
export const viewport = { themeColor: "#070b14", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
