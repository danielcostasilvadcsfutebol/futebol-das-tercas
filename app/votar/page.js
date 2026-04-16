import { supabase } from '../lib/supabase'
import VotarClient from './VotarClient'

export const revalidate = 0

export default async function VotarPage() {
  // Buscar o jogo com votação aberta
  const { data: match } = await supabase
    .from('matches')
    .select('*, series(id)')
    .eq('voting_open', true)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  let jogadores = []
  if (match) {
    const { data: matchPlayers } = await supabase
      .from('match_players')
      .select('played_for, players(id, name, team, photo_url)')
      .eq('match_id', match.id)

    jogadores = matchPlayers
      ?.map(mp => ({ ...mp.players, played_for: mp.played_for }))
      .filter(Boolean)
      .sort((a, b) => {
        if (a.team === 'white' && b.team !== 'white') return -1
        if (a.team !== 'white' && b.team === 'white') return 1
        return a.name.localeCompare(b.name)
      }) || []
  }

  return <VotarClient match={match} jogadores={jogadores} />
}
