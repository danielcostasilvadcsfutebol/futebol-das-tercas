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

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-white mb-2">⚽ Futebol das Terças</h1>
        <p className="text-slate-400">Acompanha todos os jogos, resultados e títulos</p>
      </div>

      {/* Série atual */}
      {series && (
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">🔥 Série {series.id} — Em curso</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Taça */}
            <div className="bg-slate-700 rounded-xl p-4">
              <h3 className="text-slate-400 text-sm mb-3">🏆 Taça</h3>
              {series.cup_winner ? (
                <p className="text-green-400 font-bold">
                  Vencedor: {series.cup_winner === 'white' ? '⚪ Brancos' : '⚫ Pretos'}
                </p>
              ) : (
                <div className="flex justify-around items-center">
                  <div className="text-center">
                    <p className="text-slate-300 text-sm">⚪ Brancos</p>
                    <p className="text-4xl font-bold text-white">{series.cup_white_wins}</p>
                  </div>
                  <p className="text-slate-500 text-2xl">—</p>
                  <div className="text-center">
                    <p className="text-slate-300 text-sm">⚫ Pretos</p>
                    <p className="text-4xl font-bold text-white">{series.cup_black_wins}</p>
                  </div>
                </div>
              )}
            </div>
            {/* Campeonato */}
            <div className="bg-slate-700 rounded-xl p-4">
              <h3 className="text-slate-400 text-sm mb-3">👑 Campeonato</h3>
              {series.league_winner ? (
                <p className="text-green-400 font-bold">
                  Vencedor: {series.league_winner === 'white' ? '⚪ Brancos' : '⚫ Pretos'}
                </p>
              ) : (
                <div className="flex justify-around items-center">
                  <div className="text-center">
                    <p className="text-slate-300 text-sm">⚪ Brancos</p>
                    <p className="text-4xl font-bold text-white">{series.league_white_wins}</p>
                  </div>
                  <p className="text-slate-500 text-2xl">—</p>
                  <div className="text-center">
                    <p className="text-slate-300 text-sm">⚫ Pretos</p>
                    <p className="text-4xl font-bold text-white">{series.league_black_wins}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Palmarés */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 text-center">
          <p className="text-slate-400 mb-1">⚪ Brancos</p>
          <p className="text-slate-300 text-sm">🏆 Taças: <span className="text-white font-bold">{totalBrancos}</span></p>
          <p className="text-slate-300 text-sm">👑 Campeonatos: <span className="text-white font-bold">{totalCampBrancos}</span></p>
        </div>
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 text-center">
          <p className="text-slate-400 mb-1">⚫ Pretos</p>
          <p className="text-slate-300 text-sm">🏆 Taças: <span className="text-white font-bold">{totalPretos}</span></p>
          <p className="text-slate-300 text-sm">👑 Campeonatos: <span className="text-white font-bold">{totalCampPretos}</span></p>
        </div>
      </div>
    </div>
  )
}
