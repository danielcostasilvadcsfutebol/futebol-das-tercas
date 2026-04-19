import { supabase } from '../lib/supabase'
import JogosClient from './JogosClient'

export const revalidate = 0

export default async function Jogos() {
  const { data: matches } = await supabase
    .from('matches')
    .select(`*, series(id, status), match_players(played_for, players(name, team))`)
    .order('date', { ascending: false })

  const { data: matchVotacaoRaw } = await supabase
    .from('matches')
    .select('id, voting_open, voting_closes_at, phase, match_number, series_id')
    .eq('voting_open', true)
    .maybeSingle()

  // Fechar automaticamente se o prazo já expirou
  const votacaoExpirada =
    matchVotacaoRaw?.voting_closes_at &&
    new Date(matchVotacaoRaw.voting_closes_at) < new Date()

  if (votacaoExpirada) {
    await supabase
      .from('matches')
      .update({ voting_open: false })
      .eq('id', matchVotacaoRaw.id)
  }

  const matchVotacao = votacaoExpirada ? null : matchVotacaoRaw

  const horasVotacao = matchVotacao?.voting_closes_at
    ? Math.max(0, Math.round((new Date(matchVotacao.voting_closes_at) - new Date()) / 3600000))
    : null

  // Buscar todos os votos MVP para calcular o vencedor por jogo
  const { data: todosVotos } = await supabase
    .from('mvp_votes')
    .select('match_id, voted_for_player_id, players!mvp_votes_voted_for_player_id_fkey(id, name, photo_url, team)')

  // Calcular MVP por jogo: { [match_id]: { player, count } }
  const mvpPorJogo = {}
  if (todosVotos?.length) {
    const contagemPorJogo = {}
    todosVotos.forEach(v => {
      if (!contagemPorJogo[v.match_id]) contagemPorJogo[v.match_id] = {}
      const pid = v.voted_for_player_id
      if (!contagemPorJogo[v.match_id][pid]) {
        contagemPorJogo[v.match_id][pid] = { player: v.players, count: 0 }
      }
      contagemPorJogo[v.match_id][pid].count++
    })
    Object.entries(contagemPorJogo).forEach(([matchId, candidatos]) => {
      const vencedor = Object.values(candidatos).sort((a, b) => b.count - a.count)[0]
      mvpPorJogo[matchId] = vencedor
    })
  }

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
      mvpPorJogo={mvpPorJogo}
    />
  )
}
