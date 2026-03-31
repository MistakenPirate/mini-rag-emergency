import './globals.css';

export const metadata = {
  title: 'Mini RAG',
  description: 'A simple RAG app with chat',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-200 font-sans">
        {children}
      </body>
    </html>
  );
}
