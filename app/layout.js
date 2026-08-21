export const metadata = {
  title: "Resume Reviewer Pro — AI Resume Intelligence",
  description:
    "Upload your resume and a job description to get a recruiter-grade ATS score, category breakdown, missing keywords, a 95%+ optimized rewrite, and a tailored cover letter — built by Nikhil Chary Sriramoju.",
  applicationName: "Resume Reviewer Pro",
  authors: [{ name: "Nikhil Chary Sriramoju" }],
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 44'%3E%3Cpolygon points='22,2 39,12 39,32 22,42 5,32 5,12' fill='%230A0E17' stroke='%23D9B15C' stroke-width='2'/%3E%3Ctext x='22' y='28' text-anchor='middle' font-family='Georgia,serif' font-weight='700' font-size='16' fill='%23D9B15C'%3EN%3C/text%3E%3C/svg%3E",
  },
  openGraph: {
    title: "Resume Reviewer Pro — AI Resume Intelligence",
    description:
      "A recruiter-grade ATS read on your resume, before it reaches one — score, keywords, a 95%+ rewrite, and a matching cover letter.",
    siteName: "Resume Reviewer Pro",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Resume Reviewer Pro — AI Resume Intelligence",
    description: "A recruiter-grade ATS read on your resume, before it reaches one.",
  },
};

export const viewport = {
  themeColor: "#0A0E17",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
