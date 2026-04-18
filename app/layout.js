import './globals.css'
import dynamic from 'next/dynamic'

// ← isto garante que o componente NUNCA corre no servidor
const NotificationButton = dynamic(
  () => import('./components/NotificationButton'),
  { ssr: false }
)

export const metadata = {
  title: 'Futebol das Terças',
  description: 'Site para acompanhar os jogos de futebol semanais',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="FutTerças" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
        <nav className="bg-slate-900 border-b border-slate-700 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl">⚽</a>
            <div className="flex gap-4 items-center text-sm">
              <a href="/" className="text-slate-300 hover:text-white font-medium transition">Início</a>
              <a href="/jogos" className="text-slate-300 hover:text-white font-medium transition">Jogos</a>
              <a href="/jogadores" className="text-slate-300 hover:text-white font-medium transition">Jogadores</a>
              <a href="/titulos" className="text-slate-300 hover:text-white font-medium transition">Títulos</a>
              <NotificationButton />
              <a href="/admin" className="text-slate-600 hover:text-slate-400 transition">•••</a>
            </div>
          </div>
        </nav>
        <main className="max-w-2xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
