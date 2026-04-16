import { supabase } from '../lib/supabase'

export default async function Jogadores() {
  const { data: players } = await supabase
    .from('players')
    .select(`
      *,
      match_players (
        played_for,
        matches (
          white_wins,
          black_wins
        )
      )
    `)
    .eq('active', true)
    .order('name', { ascending: true })

  const calcStats = (player) => {
    const jogos = player.match_players?.length || 0
    const vitorias = player.match_players?.reduce((acc, mp) => {
      if (!mp.matches) return acc
      if (mp.played_for === 'white') return acc + (mp.matches.white_wins || 0)
      if (mp.played_for === 'black') return acc + (mp.matches.black_wins || 0)
      return acc
    }, 0) || 0
    return { jogos, vitorias }
  }

  const brancos = players?.filter(p => p.team === 'white') || []
  const pretos = players?.filter(p => p.team === 'black') || []

  return (
    <div className="space-y-6 pb-8">
      <div className="text-center py-4">
        <h1 className="text-3xl font-bold text-white mb-1">👥 Jogadores</h1>
        <p className="text-slate-400 text-sm">Estatísticas individuais</p>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-base font-bold text-white mb-3">⚪ Equipa Branca</h2>
          <div className="space-y-2">
            {brancos.map(player => {
              const { jogos, vitorias } = calcStats(player)
              return (
                <div key={player.id} className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex items-center justify-between">
                  <p className="text-white font-semibold text-sm">{player.name}</p>
                  <div className="flex gap-4 shrink-0">
                    <p className="text-slate-400 text-xs">Jogos: <span className="text-white font-bold">{jogos}</span></p>
                    <p className="text-slate-400 text-xs">Vitórias: <span className="text-white font-bold">{vitorias}</span></p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className="text-base font-bold text-white mb-3">⚫ Equipa Preta</h2>
          <div className="space-y-2">
            {pretos.map(player => {
              const { jogos, vitorias } = calcStats(player)
              return (
                <div key={player.id} className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex items-center justify-between">
                  <p className="text-white font-semibold text-sm">{player.name}</p>
                  <div className="flex gap-4 shrink-0">
                    <p className="text-slate-400 text-xs">Jogos: <span className="text-white font-bold">{jogos}</span></p>
                    <p className="text-slate-400 text-xs">Vitórias: <span className="text-white font-bold">{vitorias}</span></p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
