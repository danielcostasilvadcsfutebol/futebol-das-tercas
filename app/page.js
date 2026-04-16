import { supabase } from './lib/supabase'

export default async function Home() {
  const { data: series } = await supabase
    .from('series')
    .select('*')
    .eq('status', 'active')
    .single()

  const { data: historico } = await supabase
    .from('series')
    .select('*')
    .eq('status', 'finished')
    .order('id', { ascending: false })

  const totalBrancos = historico?.filter(s => s.cup_winner === 'white').length || 0
  const totalPretos = historico?.filter(s => s.cup_winner === 'black').length || 0
  const totalCampBrancos = historico?.filter(s => s.league_winner === 'white').length || 0
  const totalCampPretos = historico?.filter(s => s.league_winner === 'black').length || 0

  // Série 6: taça não disputada
  const isSerie6 = series?.id === 6

  return (
    <div className="space-y-6 pb-8">
      {/* Cabeçalho */}
      <div className="text-center py-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">⚽ Futebol das Terças</h1>
        <p className="text-slate-400 text-sm">Jogos, resultados e títulos</p>
      </div>

      {/* Série atual */}
      {series && (
        <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-700">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4">
            🔥 Série {series.id} — Em curso
          </h2>

          {/* Campeonato à esquerda, Taça à direita */}
          <div className="grid grid-cols-2 gap-3">
            {/* Campeonato — ESQUERDA */}
            <div className="bg-slate-700 rounded-xl p-3 sm:p-4">
              <h3 className="text-slate-400 text-xs sm:text-sm font-semibold mb-3">👑 Campeonato</h3>
              {series.league_winner ? (
                <p className="text-green-400 font-bold text-sm">
                  🏅 {series.league_winner === 'white' ? '⚪ Brancos' : '⚫ Pretos'}
                </p>
              ) : (
                <div className="flex justify-around items-center">
                  <div className="text-center">
                    <p className="text-slate-300 text-xs">⚪</p>
                    <p className="text-3xl sm:text-4xl font-bold text-white">{series.league_white_wins}</p>
                  </div>
                  <p className="text-slate-500 text-xl">—</p>
                  <div className="text-center">
                    <p className="text-slate-300 text-xs">⚫</p>
                    <p className="text-3xl sm:text-4xl font-bold text-white">{series.league_black_wins}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Taça — DIREITA */}
            <div className="bg-slate-700 rounded-xl p-3 sm:p-4">
              <h3 className="text-slate-400 text-xs sm:text-sm font-semibold mb-3">🏆 Taça</h3>
              {isSerie6 ? (
                <p className="text-slate-500 text-sm italic">Não disputada</p>
              ) : series.cup_winner ? (
                <p className="text-green-400 font-bold text-sm">
                  🏅 {series.cup_winner === 'white' ? '⚪ Brancos' : '⚫ Pretos'}
                </p>
              ) : (
                <div className="flex justify-around items-center">
                  <div className="text-center">
                    <p className="text-slate-300 text-xs">⚪</p>
                    <p className="text-3xl sm:text-4xl font-bold text-white">{series.cup_white_wins}</p>
                  </div>
                  <p className="text-slate-500 text-xl">—</p>
                  <div className="text-center">
                    <p className="text-slate-300 text-xs">⚫</p>
                    <p className="text-3xl sm:text-4xl font-bold text-white">{series.cup_black_wins}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Palmarés */}
      <div className="bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-4">🥇 Palmarés</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-700 rounded-xl p-3 sm:p-4 text-center">
            <p className="text-white font-bold text-base mb-2">⚪ Brancos</p>
            <div className="space-y-1">
              <p className="text-slate-300 text-sm">👑 Camp.: <span className="text-white font-bold">{totalCampBrancos}</span></p>
              <p className="text-slate-300 text-sm">🏆 Taças: <span className="text-white font-bold">{totalBrancos}</span></p>
            </div>
          </div>
          <div className="bg-slate-700 rounded-xl p-3 sm:p-4 text-center">
            <p className="text-white font-bold text-base mb-2">⚫ Pretos</p>
            <div className="space-y-1">
              <p className="text-slate-300 text-sm">👑 Camp.: <span className="text-white font-bold">{totalCampPretos}</span></p>
              <p className="text-slate-300 text-sm">🏆 Taças: <span className="text-white font-bold">{totalPretos}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Links rápidos — útil no mobile */}
      <div className="grid grid-cols-3 gap-3">
        <a href="/jogos" className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 rounded-xl p-3 text-center transition">
          <p className="text-2xl mb-1">📅</p>
          <p className="text-white text-xs sm:text-sm font-medium">Jogos</p>
        </a>
        <a href="/jogadores" className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 rounded-xl p-3 text-center transition">
          <p className="text-2xl mb-1">👥</p>
          <p className="text-white text-xs sm:text-sm font-medium">Jogadores</p>
        </a>
        <a href="/titulos" className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 rounded-xl p-3 text-center transition">
          <p className="text-2xl mb-1">🏆</p>
          <p className="text-white text-xs sm:text-sm font-medium">Títulos</p>
        </a>
      </div>
    </div>
  )
}
