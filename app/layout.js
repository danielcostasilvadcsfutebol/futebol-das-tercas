import './globals.css'

export const metadata = {
  title: 'Futebol das Terças',
  description: 'Site para acompanhar os jogos de futebol semanais',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body>
        <nav className="bg-slate-900 border-b border-slate-700 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-white">
              ⚽ Futebol das Terças
            </a>
            <div className="flex gap-6">
              <a href="/" className="text-slate-300 hover:text-white transition">Início</a>
              <a href="/jogos" className="text-slate-300 hover:text-white transition">Jogos</a>
              <a href="/jogadores" className="text-slate-300 hover:text-white transition">Jogadores</a>
              <a href="/titulos" className="text-slate-300 hover:text-white transition">Títulos</a>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
