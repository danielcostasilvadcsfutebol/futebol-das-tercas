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
    .select('voted_for_player_id, match_id')

  // Agrupar por jogo e encontrar o vencedor de cada jogo
  const votesByMatch = {}
  allMvpVotes?.forEach(v => {
    if (!votesByMatch[v.match_id]) votesByMatch[v.match_id] = {}
    votesByMatch[v.match_id][v.voted_for_player_id] = (votesByMatch[v.match_id][v.voted_for_player_id] || 0) + 1
  })

  // Contar vitórias MVP por jogador (um win por jogo, quem tiver mais votos)
  const mvpWins = {}
  Object.values(votesByMatch).forEach(matchVotes => {
    const sorted = Object.entries(matchVotes).sort((a, b) => b[1] - a[1])
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
      .select('voted_for_player_id, match_id, matches(date, phase, match_number, series_id)')
      .order('voted_at', { ascending: false })

    if (votosRecentes?.length > 0) {
      const matchIdMaisRecente = votosRecentes[0].match_id
      const votosDessaPartida = votosRecentes.filter(v => v.match_id === matchIdMaisRecente)
      const contagem = {}
      votosDessaPartida.forEach(v => {
        contagem[v.voted_for_player_id] = (contagem[v.voted_for_player_id] || 0) + 1
      })
      const mvpId = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0]
      if (mvpId) {
        const { data: mvpPlayer } = await supabase
          .from('players')
          .select('id, name, photo_url, team')
          .eq('id', mvpId)
          .single()
        ultimoMvp = {
          player: mvpPlayer,
          votos: contagem[mvpId],
          match: votosRecentes[0].matches,
          matchId: matchIdMaisRecente,
        }
      }
    }
  }

  return <JogadoresClient todosAtivos={todosAtivos} inativos={inativos} ultimoMvp={ultimoMvp} />
}
