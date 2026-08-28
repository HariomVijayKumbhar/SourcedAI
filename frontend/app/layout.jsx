import "./globals.css";

export const metadata = {
  title: "SourceAI — Intelligent Knowledge Assistant with Citations",
  description: "Upload your PDFs and Word documents to get verified, cited answers powered by Retrieval-Augmented Generation.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0B0F19] text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
