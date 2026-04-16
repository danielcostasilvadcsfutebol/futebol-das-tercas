import { supabase } from '../lib/supabase'

export const revalidate = 0

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

  const labelJornada = (match) => {
    if (!match.match_number) return null
    return match.phase === 'cup' ? `Jogo ${match.match_number}` : `Jornada ${match.match_number}`
  }

  const agendados = matches?.filter(m => m.white_wins === null && m.black_wins === null)
    .sort((a, b) => new Date(a.date) - new Date(b.date)) ?? []
  const realizados = matches?.filter(m => m.white_wins !== null && m.black_wins !== null)
    .sort((a, b) => new Date(b.date) - new Date(a.date)) ?? []

  return (
    <div className="space-y-6 pb-8">
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-white mb-1">📅 Jogos</h1>
        <p className="text-slate-400 text-sm">Todas as sessões e resultados</p>
      </div>

      {(!matches || matches.length === 0) && (
        <div className="text-center text-slate-400 py-12">
          Ainda não há jogos registados.
        </div>
      )}

      {/* Agendados */}
      {agendados.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-yellow-400 mb-3">📆 Agendados ({agendados.length})</h2>
          <div className="space-y-3">
            {agendados.map(match => {
              const brancos = match.match_players?.filter(mp => mp.played_for === 'white').map(mp => mp.players?.name).filter(Boolean)
              const pretos = match.match_players?.filter(mp => mp.played_for === 'black').map(mp => mp.players?.name).filter(Boolean)
              return (
                <div key={match.id} className="bg-slate-800 rounded-xl p-3 border border-yellow-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-300 text-xs font-medium">
                        {new Date(match.date).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-slate-400 text-xs">
                        Série {match.series?.id} · {match.phase === 'cup' ? '🏆 Taça' : '👑 Camp.'}
                        {match.match_number ? ` · ${labelJornada(match)}` : ''}
                      </p>
                    </div>
                    <span className="text-yellow-400 text-xs font-medium bg-yellow-500/10 px-2.5 py-1 rounded-lg">
                      Por realizar
                    </span>
                  </div>
                  {(brancos?.length > 0 || pretos?.length > 0) && (
                    <div className="mt-2 pt-2 border-t border-slate-700 grid grid-cols-2 gap-2">
                      <p className="text-slate-400 text-xs">⚪ {brancos?.join(', ')}</p>
                      <p className="text-slate-400 text-xs">⚫ {pretos?.join(', ')}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Realizados */}
      {realizados.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-300 mb-3">✅ Realizados ({realizados.length})</h2>
          <div className="space-y-3">
            {realizados.map(match => {
              const brancos = match.match_players?.filter(mp => mp.played_for === 'white').map(mp => mp.players?.name).filter(Boolean)
              const pretos = match.match_players?.filter(mp => mp.played_for === 'black').map(mp => mp.players?.name).filter(Boolean)
              return (
                <div key={match.id} className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs">
                        {new Date(match.date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <p className="text-slate-300 text-xs">
                        Série {match.series?.id} · {match.phase === 'cup' ? '🏆 Taça' : '👑 Camp.'}
                        {match.match_number ? ` · ${labelJornada(match)}` : ''}
                      </p>
                    </div>
                    <span className="text-white font-bold text-sm bg-slate-700 px-3 py-1 rounded-lg">
                      {match.white_wins} — {match.black_wins}
                    </span>
                  </div>
                  {(brancos?.length > 0 || pretos?.length > 0) && (
                    <div className="mt-2 pt-2 border-t border-slate-700 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-slate-500 text-xs mb-0.5">⚪ Brancos</p>
                        <p className="text-slate-300 text-xs">{brancos?.join(', ')}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs mb-0.5">⚫ Pretos</p>
                        <p className="text-slate-300 text-xs">{pretos?.join(', ')}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
