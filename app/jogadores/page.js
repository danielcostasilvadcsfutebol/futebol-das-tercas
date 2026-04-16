import { supabase } from '../lib/supabase'
import JogadoresClient from './JogadoresClient'

export const revalidate = 0

export default async function Jogadores() {
  const { data: players } = await supabase
    .from('players')
    .select(`
      *,
      match_players (
        played_for,
        matches (
          id,
          white_wins,
          black_wins
        )
      )
    `)
    .order('name', { ascending: true })

  const { data: mvpVotes } = await supabase
    .from('mvp_votes')
    .select('voted_for_player_id')

  const mvpCount = {}
  mvpVotes?.forEach(v => {
    mvpCount[v.voted_for_player_id] = (mvpCount[v.voted_for_player_id] || 0) + 1
  })

  const calcStats = (player) => {
    const comResultado = player.match_players?.filter(
      mp => mp.matches?.white_wins !== null && mp.matches?.black_wins !== null
    ) || []
    const jogos = comResultado.length
    const vitorias = comResultado.filter(mp => {
      if (mp.played_for === 'white') return mp.matches.white_wins > mp.matches.black_wins
      if (mp.played_for === 'black') return mp.matches.black_wins > mp.matches.white_wins
      return false
    }).length
    const pct = jogos > 0 ? Math.round((vitorias / jogos) * 100) : 0
    const mvp = mvpCount[player.id] || 0
    return { jogos, vitorias, pct, mvp }
  }

  const todosAtivos = players
    ?.filter(p => p.active)
    .map(p => ({ ...p, stats: calcStats(p) }))
    .sort((a, b) => {
      if (b.stats.jogos === 0 && a.stats.jogos === 0) return a.name.localeCompare(b.name)
      if (b.stats.jogos === 0) return -1
      if (a.stats.jogos === 0) return 1
      return b.stats.pct - a.stats.pct || b.stats.vitorias - a.stats.vitorias
    }) || []

  const inativos = players?.filter(p => !p.active) || []
  const topMvp = [...todosAtivos].sort((a, b) => b.stats.mvp - a.stats.mvp)[0]

  return <JogadoresClient todosAtivos={todosAtivos} inativos={inativos} topMvp={topMvp} />
}
