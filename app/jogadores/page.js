import { supabase } from '../lib/supabase'
import JogadoresClient from './JogadoresClient'

export const revalidate = 0

export default async function Jogadores() {
  const { data: players } = await supabase
    .from('players')
    .select(`*, match_players(played_for, matches(id, white_wins, black_wins))`)
    .order('name', { ascending: true })

  // Buscar todos os votos MVP para calcular vitórias (quem ganhou cada jogo)
  const { data: allMvpVotes } = await supabase
    .from('mvp_votes')
    .select('voted_for_player_id, match_id, voted_at')
    .order('voted_at', { ascending: true })

  // Agrupar por jogo e encontrar o vencedor de cada jogo
  const votesByMatch = {}
  allMvpVotes?.forEach(v => {
    const pid = v.voted_for_player_id
    if (!votesByMatch[v.match_id]) votesByMatch[v.match_id] = {}
    if (!votesByMatch[v.match_id][pid]) {
      votesByMatch[v.match_id][pid] = { count: 0, firstVotedAt: v.voted_at }
    }
    votesByMatch[v.match_id][pid].count++
    // firstVotedAt já é o mais antigo pois a query está ordenada ASC
  })

  // Contar vitórias MVP por jogador; desempate pelo primeiro voto mais antigo
  const mvpWins = {}
  Object.values(votesByMatch).forEach(matchVotes => {
    const sorted = Object.entries(matchVotes).sort(([, a], [, b]) =>
      b.count - a.count || new Date(a.firstVotedAt) - new Date(b.firstVotedAt)
    )
    if (sorted.length > 0) {
      const winnerId = sorted[0][0]
      mvpWins[winnerId] = (mvpWins[winnerId] || 0) + 1
    }
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
    const mvp = mvpWins[player.id] || 0  // vitórias MVP, não total de votos
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

  // Verificar se há votação aberta — se sim, não mostrar MVP
  const { data: votacaoAberta } = await supabase
    .from('matches')
    .select('id')
    .eq('voting_open', true)
    .maybeSingle()

  // Último MVP — só quando não há votação aberta
  let ultimoMvp = null
  if (!votacaoAberta) {
    const { data: votosRecentes } = await supabase
      .from('mvp_votes')
      .select('voted_for_player_id, match_id, voted_at, matches(date, phase, match_number, series_id)')
      .order('voted_at', { ascending: true })

    if (votosRecentes?.length > 0) {
      // Último jogo (ordem ASC, por isso o último elemento tem o match mais recente)
      const matchIdMaisRecente = votosRecentes[votosRecentes.length - 1].match_id
      const votosDessaPartida = votosRecentes.filter(v => v.match_id === matchIdMaisRecente)
      const contagem = {}
      votosDessaPartida.forEach(v => {
        const pid = v.voted_for_player_id
        if (!contagem[pid]) contagem[pid] = { count: 0, firstVotedAt: v.voted_at }
        contagem[pid].count++
        // firstVotedAt já é o mais antigo pois a query está ordenada ASC
      })
      // Desempate: mais votos primeiro; em empate, primeiro voto mais antigo vence
      const mvpId = Object.entries(contagem).sort(([, a], [, b]) =>
        b.count - a.count || new Date(a.firstVotedAt) - new Date(b.firstVotedAt)
      )[0]?.[0]
      if (mvpId) {
        const { data: mvpPlayer } = await supabase
          .from('players')
          .select('id, name, photo_url, team')
          .eq('id', mvpId)
          .single()
        ultimoMvp = {
          player: mvpPlayer,
          votos: contagem[mvpId].count,
          match: votosRecentes.find(v => v.match_id === matchIdMaisRecente)?.matches,
          matchId: matchIdMaisRecente,
        }
      }
    }
  }

  return <JogadoresClient todosAtivos={todosAtivos} inativos={inativos} ultimoMvp={ultimoMvp} />
}
