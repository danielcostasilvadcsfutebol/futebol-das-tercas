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
    .order('name', { ascending: true })

  const calcStats = (player) => {
    // Só conta jogos que já têm resultado
    const jogosComResultado = player.match_players?.filter(mp => mp.matches?.white_wins !== null) || []
    const jogos = jogosComResultado.length
    const vitorias = jogosComResultado.reduce((acc, mp) => {
      if (!mp.matches) return acc
      if (mp.played_for === 'white') return acc + (mp.matches.white_wins || 0)
      if (mp.played_for === 'black') return acc + (mp.matches.black_wins || 0)
      return acc
    }, 0)
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
        {/* Equipa Branca */}
        <div>
          <h2 className="text-base font-bold text-white mb-3">⚪ Equipa Branca</h2>
          <div className="space-y-2">
            {brancos.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Nenhum jogador registado.</p>
            )}
            {brancos.map(player => {
              const { jogos, vitorias } = calcStats(player)
              return (
                <div key={player.id} className={`bg-slate-800 rounded-xl p-3 border flex items-center justify-between ${player.active ? 'border-slate-700' : 'border-slate-700/50 opacity-60'}`}>
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold text-sm ${player.active ? 'text-white' : 'text-slate-400'}`}>
                      {player.name}
                    </p>
                    {!player.active && (
                      <span className="text-xs bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">inativo</span>
                    )}
                  </div>
                  <div className="flex gap-4 shrink-0">
                    <p className="text-slate-400 text-xs">Jogos: <span className="text-white font-bold">{jogos}</span></p>
                    <p className="text-slate-400 text-xs">Vitórias: <span className="text-white font-bold">{vitorias}</span></p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Equipa Preta */}
        <div>
          <h2 className="text-base font-bold text-white mb-3">⚫ Equipa Preta</h2>
          <div className="space-y-2">
            {pretos.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Nenhum jogador registado.</p>
            )}
            {pretos.map(player => {
              const { jogos, vitorias } = calcStats(player)
              return (
                <div key={player.id} className={`bg-slate-800 rounded-xl p-3 border flex items-center justify-between ${player.active ? 'border-slate-700' : 'border-slate-700/50 opacity-60'}`}>
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold text-sm ${player.active ? 'text-white' : 'text-slate-400'}`}>
                      {player.name}
                    </p>
                    {!player.active && (
                      <span className="text-xs bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">inativo</span>
                    )}
                  </div>
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
