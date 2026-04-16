import './globals.css'

export const metadata = {
  title: 'Futebol das Terças',
  description: 'Site para acompanhar os jogos de futebol semanais',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body>
        <nav className="bg-slate-900 border-b border-slate-700 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl">⚽</a>
            <div className="flex gap-5 text-sm">
              <a href="/" className="text-slate-300 hover:text-white font-medium transition">Início</a>
              <a href="/jogos" className="text-slate-300 hover:text-white font-medium transition">Jogos</a>
              <a href="/jogadores" className="text-slate-300 hover:text-white font-medium transition">Jogadores</a>
              <a href="/titulos" className="text-slate-300 hover:text-white font-medium transition">Títulos</a>
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
