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
    <div className="space-y-6 pb-8">
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-white mb-1">📅 Jogos</h1>
        <p className="text-slate-400 text-sm">Todas as sessões e resultados</p>
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
          const dataFormatada = new Date(match.date).toLocaleDateString('pt-PT', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
          })
          return (
            <div key={match.id} className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div>
                  <p className="text-slate-400 text-xs capitalize">{dataFormatada}</p>
                  <p className="text-slate-300 text-xs mt-0.5">
                    Série {match.series?.id} · {match.phase === 'cup' ? '🏆 Taça' : '👑 Campeonato'}
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-slate-700 rounded-xl px-4 py-2 shrink-0">
                  <div className="text-center">
                    <p className="text-slate-400 text-xs">⚪</p>
                    <p className="text-2xl font-bold text-white leading-none">{match.white_wins}</p>
                  </div>
                  <p className="text-slate-500">—</p>
                  <div className="text-center">
                    <p className="text-slate-400 text-xs">⚫</p>
                    <p className="text-2xl font-bold text-white leading-none">{match.black_wins}</p>
                  </div>
                </div>
              </div>

              {(brancos?.length > 0 || pretos?.length > 0) && (
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">⚪ Brancos</p>
                    <div className="space-y-0.5">
                      {brancos?.map((nome, i) => (
                        <p key={i} className="text-slate-300 text-xs">{nome}</p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">⚫ Pretos</p>
                    <div className="space-y-0.5">
                      {pretos?.map((nome, i) => (
                        <p key={i} className="text-slate-300 text-xs">{nome}</p>
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
