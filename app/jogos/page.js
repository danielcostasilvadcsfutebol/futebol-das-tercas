import { supabase } from '../lib/supabase'
import VotarClient from './VotarClient'

export const revalidate = 0

export default async function VotarPage() {
  // Buscar o jogo com votação aberta
  const { data: matchRaw } = await supabase
    .from('matches')
    .select('*, series(id)')
    .eq('voting_open', true)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fechar automaticamente se o prazo já expirou
  const votacaoExpirada =
    matchRaw?.voting_closes_at &&
    new Date(matchRaw.voting_closes_at) < new Date()

  if (votacaoExpirada) {
    await supabase
      .from('matches')
      .update({ voting_open: false })
      .eq('id', matchRaw.id)
  }

  const match = votacaoExpirada ? null : matchRaw

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
