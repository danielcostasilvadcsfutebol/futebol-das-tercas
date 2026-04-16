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
        <nav className="bg-slate-900 border-b border-slate-700 px-4 py-3 sticky top-0 z-50">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <a href="/" className="text-base sm:text-xl font-bold text-white">
              ⚽ Futebol das Terças
            </a>
            <div className="flex gap-3 sm:gap-6 text-sm sm:text-base">
              <a href="/" className="text-slate-300 hover:text-white transition">Início</a>
              <a href="/jogos" className="text-slate-300 hover:text-white transition">Jogos</a>
              <a href="/jogadores" className="text-slate-300 hover:text-white transition">Jogadores</a>
              <a href="/titulos" className="text-slate-300 hover:text-white transition">Títulos</a>
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
