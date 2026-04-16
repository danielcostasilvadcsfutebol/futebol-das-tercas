import { supabase } from '../lib/supabase'
import JogosClient from './JogosClient'

export const revalidate = 0

export default async function Jogos() {
  const { data: matches } = await supabase
    .from('matches')
    .select(`*, series(id, status), match_players(played_for, players(name, team))`)
    .order('date', { ascending: false })

  const { data: matchVotacao } = await supabase
    .from('matches')
    .select('id, voting_open, voting_closes_at, phase, match_number, series_id')
    .eq('voting_open', true)
    .maybeSingle()

  const horasVotacao = matchVotacao?.voting_closes_at
    ? Math.max(0, Math.round((new Date(matchVotacao.voting_closes_at) - new Date()) / 3600000))
    : null

  const agendados = matches?.filter(m => m.white_wins === null && m.black_wins === null)
    .sort((a, b) => new Date(a.date) - new Date(b.date)) ?? []
  const realizados = matches?.filter(m => m.white_wins !== null && m.black_wins !== null)
    .sort((a, b) => new Date(b.date) - new Date(a.date)) ?? []

  return (
    <JogosClient
      agendados={agendados}
      realizados={realizados}
      matchVotacao={matchVotacao}
      horasVotacao={horasVotacao}
    />
  )
}
