import { supabase } from '../lib/supabase'

export default async function Titulos() {
  const { data: series } = await supabase
    .from('series')
    .select('*')
    .order('id', { ascending: true })

  return (
    <div className="space-y-6 pb-8">
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-white mb-1">🏆 Títulos</h1>
        <p className="text-slate-400 text-sm">Histórico de todas as séries</p>
      </div>

      <div className="space-y-4">
        {series?.map(serie => {
          const isSerie6 = serie.id === 6
          return (
            <div key={serie.id} className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white">Série {serie.id}</h2>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${serie.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-300'}`}>
                  {serie.status === 'active' ? '🟢 Em curso' : '✅ Terminada'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs mb-1">👑 Campeonato</p>
                  {serie.league_winner ? (
                    <p className="text-white font-bold text-sm">
                      {serie.league_winner === 'white' ? '⚪ Brancos' : '⚫ Pretos'}
                    </p>
                  ) : (
                    <p className="text-slate-500 text-xs">Em curso ({serie.league_white_wins} — {serie.league_black_wins})</p>
                  )}
                </div>
                <div className="bg-slate-700 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs mb-1">🏆 Taça</p>
                  {isSerie6 ? (
                    <p className="text-slate-500 text-xs italic">Não disputada</p>
                  ) : serie.cup_winner ? (
                    <p className="text-white font-bold text-sm">
                      {serie.cup_winner === 'white' ? '⚪ Brancos' : '⚫ Pretos'}
                    </p>
                  ) : (
                    <p className="text-slate-500 text-xs">Em curso ({serie.cup_white_wins} — {serie.cup_black_wins})</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
