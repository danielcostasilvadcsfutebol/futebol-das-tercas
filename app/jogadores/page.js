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
    <div className="space-y-8">
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold text-white mb-2">👥 Jogadores</h1>
        <p className="text-slate-400">Estatísticas individuais de todos os jogadores</p>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Equipa Branca */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">⚪ Equipa Branca</h2>
          <div className="space-y-3">
            {brancos.map(player => {
              const { jogos, vitorias } = calcStats(player)
              return (
                <div key={player.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <p className="text-white font-semibold">{player.name}</p>
                  <div className="flex gap-4 mt-2">
                    <p className="text-slate-400 text-sm">Jogos: <span className="text-white">{jogos}</span></p>
                    <p className="text-slate-400 text-sm">Vitórias: <span className="text-white">{vitorias}</span></p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Equipa Preta */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">⚫ Equipa Preta</h2>
          <div className="space-y-3">
            {pretos.map(player => {
              const { jogos, vitorias } = calcStats(player)
              return (
                <div key={player.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                  <p className="text-white font-semibold">{player.name}</p>
                  <div className="flex gap-4 mt-2">
                    <p className="text-slate-400 text-sm">Jogos: <span className="text-white">{jogos}</span></p>
                    <p className="text-slate-400 text-sm">Vitórias: <span className="text-white">{vitorias}</span></p>
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
