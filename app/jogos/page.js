import { supabase } from '../lib/supabase'

export default async function Jogos() {
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      series (id, status),
      match_players (
        played_for,
        players (name, team)
      )
    `)
    .order('date', { ascending: false })

  return (
    <div className="space-y-8">
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-white mb-2">📅 Jogos</h1>
        <p className="text-slate-400">Todas as sessões semanais e resultados</p>
      </div>

      <div className="space-y-4">
        {matches?.length === 0 && (
          <div className="text-center text-slate-400 py-12">
            Ainda não há jogos registados.
          </div>
        )}
        {matches?.map(match => {
          const brancos = match.match_players?.filter(mp => mp.played_for === 'white').map(mp => mp.players?.name)
          const pretos = match.match_players?.filter(mp => mp.played_for === 'black').map(mp => mp.players?.name)
          return (
            <div key={match.id} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-slate-400 text-sm">
                    {new Date(match.date).toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-slate-300 text-sm mt-1">
                    Série {match.series?.id} — {match.phase === 'cup' ? '🏆 Taça' : '👑 Campeonato'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-slate-300 text-xs">⚪ Brancos</p>
                    <p className="text-3xl font-bold text-white">{match.white_wins}</p>
                  </div>
                  <p className="text-slate-500 text-xl">—</p>
                  <div className="text-center">
                    <p className="text-slate-300 text-xs">⚫ Pretos</p>
                    <p className="text-3xl font-bold text-white">{match.black_wins}</p>
                  </div>
                </div>
              </div>
              {(brancos?.length > 0 || pretos?.length > 0) && (
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-700">
                  <div>
                    <p className="text-slate-400 text-xs mb-2">⚪ Equipa Branca</p>
                    <div className="space-y-1">
                      {brancos?.map((nome, i) => (
                        <p key={i} className="text-slate-300 text-sm">{nome}</p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-2">⚫ Equipa Preta</p>
                    <div className="space-y-1">
                      {pretos?.map((nome, i) => (
                        <p key={i} className="text-slate-300 text-sm">{nome}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
