import { supabase } from '../lib/supabase'

export default async function Titulos() {
  const { data: series } = await supabase
    .from('series')
    .select('*')
    .order('id', { ascending: true })

  return (
    <div className="space-y-8">
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-white mb-2">🏆 Títulos</h1>
        <p className="text-slate-400">Histórico de todas as séries e vencedores</p>
      </div>

      <div className="space-y-4">
        {series?.map(serie => (
          <div key={serie.id} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Série {serie.id}</h2>
              <span className={`text-sm px-3 py-1 rounded-full ${serie.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-300'}`}>
                {serie.status === 'active' ? 'Em curso' : 'Terminada'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700 rounded-xl p-4 text-center">
                <p className="text-slate-400 text-sm mb-1">🏆 Taça</p>
                {serie.cup_winner ? (
                  <p className="text-white font-bold">
                    {serie.cup_winner === 'white' ? '⚪ Brancos' : '⚫ Pretos'}
                  </p>
                ) : (
                  <p className="text-slate-500">Em curso ({serie.cup_white_wins} — {serie.cup_black_wins})</p>
                )}
              </div>
              <div className="bg-slate-700 rounded-xl p-4 text-center">
                <p className="text-slate-400 text-sm mb-1">👑 Campeonato</p>
                {serie.league_winner ? (
                  <p className="text-white font-bold">
                    {serie.league_winner === 'white' ? '⚪ Brancos' : '⚫ Pretos'}
                  </p>
                ) : (
                  <p className="text-slate-500">Em curso ({serie.league_white_wins} — {serie.league_black_wins})</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
