import { supabase } from '../../lib/supabase'
import { notFound } from 'next/navigation'

export const revalidate = 0

function calcIdade(birthDate) {
  if (!birthDate) return null
  const hoje = new Date()
  const nasc = new Date(birthDate)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export default async function PerfilJogador({ params }) {
  const { data: player } = await supabase
    .from('players')
    .select(`
      *,
      match_players (
        played_for,
        matches (
          id, date, white_wins, black_wins, phase, match_number, series (id)
        )
      )
    `)
    .eq('id', params.id)
    .single()

  if (!player) notFound()

  // Total de jogos realizados (para assiduidade)
  const { count: totalJogos } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .not('white_wins', 'is', null)

  // Votos recebidos
  const { data: votesReceived } = await supabase
    .from('mvp_votes')
    .select('match_id, voted_at, matches(date, phase, match_number, series_id, voting_open)')
    .eq('voted_for_player_id', params.id)
    .order('voted_at', { ascending: false })

  // Votos dados
  const { data: votesGiven } = await supabase
    .from('mvp_votes')
    .select(`voted_for_player_id, match_id, voted_at, candidate:players!mvp_votes_voted_for_player_id_fkey(id, name, photo_url, team), match:matches(voting_open)`)
    .eq('voter_player_id', params.id)
    .order('voted_at', { ascending: false })

  // Filtrar votos de jogos com votação ainda aberta (não revelar resultados)
  const votesReceivedFiltered = votesReceived?.filter(v => !v.matches?.voting_open) || []
  const votesGivenFiltered = votesGiven?.filter(v => !v.match?.voting_open) || []

  // MVP wins
  const matchIdsWithVotes = [...new Set(votesReceivedFiltered?.map(v => v.match_id) || [])]
  let mvpWins = []
  if (matchIdsWithVotes.length > 0) {
    const { data: allVotesInMatches } = await supabase
      .from('mvp_votes')
      .select('match_id, voted_for_player_id, voted_at')
      .in('match_id', matchIdsWithVotes)
    const votesByMatch = {}
    allVotesInMatches?.forEach(v => {
      if (!votesByMatch[v.match_id]) votesByMatch[v.match_id] = {}
      if (!votesByMatch[v.match_id][v.voted_for_player_id]) {
        votesByMatch[v.match_id][v.voted_for_player_id] = { count: 0, firstVotedAt: v.voted_at }
      }
      votesByMatch[v.match_id][v.voted_for_player_id].count++
      // Guardar o voto mais antigo para desempate
      if (v.voted_at < votesByMatch[v.match_id][v.voted_for_player_id].firstVotedAt) {
        votesByMatch[v.match_id][v.voted_for_player_id].firstVotedAt = v.voted_at
      }
    })
    // Determinar vencedor com desempate pelo voto mais antigo
    const getWinner = (matchVotes) =>
      Object.entries(matchVotes).sort(([, a], [, b]) =>
        b.count - a.count || new Date(a.firstVotedAt) - new Date(b.firstVotedAt)
      )[0]
    mvpWins = Object.entries(votesByMatch)
      .filter(([, matchVotes]) => getWinner(matchVotes)?.[0] === params.id)
      .map(([matchId, matchVotes]) => {
        const matchInfo = votesReceivedFiltered?.find(v => String(v.match_id) === matchId)
        return { matchId, match: matchInfo?.matches, votos: matchVotes[params.id]?.count || 0 }
      })
      .sort((a, b) => new Date(b.match?.date || 0) - new Date(a.match?.date || 0))
  }

  // Colegas de equipa mais frequentes
  const matchIdsDoJogador = player.match_players
    ?.filter(mp => mp.matches?.white_wins !== null)
    .map(mp => ({ matchId: mp.matches?.id, team: mp.played_for })) || []

  let colegasMaisFrequentes = []
  if (matchIdsDoJogador.length > 0) {
    const matchIds = matchIdsDoJogador.map(m => m.matchId)
    const { data: allMatchPlayers } = await supabase
      .from('match_players')
      .select('match_id, played_for, players(id, name, photo_url, team)')
      .in('match_id', matchIds)
      .neq('player_id', params.id)

    const contagemColegas = {}
    allMatchPlayers?.forEach(mp => {
      const meuTime = matchIdsDoJogador.find(m => m.matchId === mp.match_id)?.team
      if (mp.played_for === meuTime) {
        const pid = mp.players?.id
        if (!pid) return
        if (!contagemColegas[pid]) contagemColegas[pid] = { player: mp.players, count: 0 }
        contagemColegas[pid].count++
      }
    })
    colegasMaisFrequentes = Object.values(contagemColegas)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  // Estatísticas gerais
  const comResultado = player.match_players?.filter(
    mp => mp.matches?.white_wins !== null && mp.matches?.black_wins !== null
  ) || []

  const jogos = comResultado.length
  const assiduidade = totalJogos > 0 ? Math.round((jogos / totalJogos) * 100) : 0

  const vitorias = comResultado.filter(mp =>
    mp.played_for === 'white' ? mp.matches.white_wins > mp.matches.black_wins : mp.matches.black_wins > mp.matches.white_wins
  ).length
  const derrotas = comResultado.filter(mp =>
    mp.played_for === 'white' ? mp.matches.white_wins < mp.matches.black_wins : mp.matches.black_wins < mp.matches.white_wins
  ).length
  const empates = jogos - vitorias - derrotas
  const pct = jogos > 0 ? Math.round((vitorias / jogos) * 100) : 0
  const mvpTotal = mvpWins.length

  const jogosLiga = comResultado.filter(mp => mp.matches.phase === 'league')
  const jogosTaca = comResultado.filter(mp => mp.matches.phase === 'cup')
  const vitoriasLiga = jogosLiga.filter(mp =>
    mp.played_for === 'white' ? mp.matches.white_wins > mp.matches.black_wins : mp.matches.black_wins > mp.matches.white_wins
  ).length
  const vitoriasTaca = jogosTaca.filter(mp =>
    mp.played_for === 'white' ? mp.matches.white_wins > mp.matches.black_wins : mp.matches.black_wins > mp.matches.white_wins
  ).length

  const jogosOrdenados = [...comResultado].sort((a, b) => new Date(b.matches.date) - new Date(a.matches.date))
  const ultimos10 = jogosOrdenados.slice(0, 10)

  // Sequência atual
  let streakCount = 0
  let streakType = null
  for (const mp of jogosOrdenados) {
    const ganhou = mp.played_for === 'white' ? mp.matches.white_wins > mp.matches.black_wins : mp.matches.black_wins > mp.matches.white_wins
    const perdeu = mp.played_for === 'white' ? mp.matches.white_wins < mp.matches.black_wins : mp.matches.black_wins < mp.matches.white_wins
    const res = ganhou ? 'V' : perdeu ? 'D' : 'E'
    if (streakType === null) { streakType = res; streakCount = 1 }
    else if (res === streakType) streakCount++
    else break
  }

  // Melhor sequência de vitórias de sempre
  let melhorSequencia = 0
  let sequenciaAtual = 0
  for (const mp of jogosOrdenados) {
    const ganhou = mp.played_for === 'white' ? mp.matches.white_wins > mp.matches.black_wins : mp.matches.black_wins > mp.matches.white_wins
    if (ganhou) { sequenciaAtual++; if (sequenciaAtual > melhorSequencia) melhorSequencia = sequenciaAtual }
    else sequenciaAtual = 0
  }

  const forma = ultimos10.map(mp => {
    const ganhou = mp.played_for === 'white' ? mp.matches.white_wins > mp.matches.black_wins : mp.matches.black_wins > mp.matches.white_wins
    const perdeu = mp.played_for === 'white' ? mp.matches.white_wins < mp.matches.black_wins : mp.matches.black_wins < mp.matches.white_wins
    return ganhou ? 'V' : perdeu ? 'D' : 'E'
  })

  const votosDadosPorJogador = {}
  votesGivenFiltered?.forEach(v => {
    const cid = v.voted_for_player_id
    if (!votosDadosPorJogador[cid]) votosDadosPorJogador[cid] = { player: v.candidate, count: 0 }
    votosDadosPorJogador[cid].count++
  })
  const votosDadosOrdenados = Object.values(votosDadosPorJogador).sort((a, b) => b.count - a.count)

  const idade = calcIdade(player.birth_date)
  const isWhite = player.team === 'white'

  const labelJornada = (m) => {
    if (!m?.match_number) return null
    return m.phase === 'cup' ? `Jogo ${m.match_number}` : `Jorn. ${m.match_number}`
  }

  const streakLabel = streakType === 'V' ? 'vitória' : streakType === 'D' ? 'derrota' : 'empate'
  const streakLabelPlural = streakType === 'V' ? 'vitórias' : streakType === 'D' ? 'derrotas' : 'empates'
  const streakColor = streakType === 'V' ? '#22c55e' : streakType === 'D' ? '#ef4444' : '#64748b'
  const streakBg = streakType === 'V' ? 'rgba(34,197,94,0.08)' : streakType === 'D' ? 'rgba(239,68,68,0.08)' : 'rgba(100,116,139,0.08)'
  const streakBorder = streakType === 'V' ? 'rgba(34,197,94,0.2)' : streakType === 'D' ? 'rgba(239,68,68,0.2)' : 'rgba(100,116,139,0.2)'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        .perfil-page { font-family: 'DM Sans', sans-serif; }
        .display-font { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }

        .stat-block {
          background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98));
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 14px;
          text-align: center;
          flex: 1;
        }
        .stat-block .val {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.2rem;
          line-height: 1;
          color: white;
        }
        .stat-block .lbl {
          font-size: 0.62rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 3px;
        }

        .section-card {
          background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98));
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 16px;
        }
        .section-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 0.95rem;
          letter-spacing: 0.1em;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .resultado-pill {
          width: 28px; height: 28px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.7rem; font-weight: 700;
          flex-shrink: 0;
        }
        .resultado-v { background: rgba(34,197,94,0.15); color: #22c55e; }
        .resultado-d { background: rgba(239,68,68,0.15); color: #ef4444; }
        .resultado-e { background: rgba(100,116,139,0.2); color: #94a3b8; }

        .forma-dot {
          width: 30px; height: 30px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.62rem; font-weight: 800;
          flex-shrink: 0;
        }
        .forma-V { background: rgba(34,197,94,0.15); color: #22c55e; border: 1.5px solid rgba(34,197,94,0.3); }
        .forma-D { background: rgba(239,68,68,0.15); color: #ef4444; border: 1.5px solid rgba(239,68,68,0.3); }
        .forma-E { background: rgba(100,116,139,0.12); color: #64748b; border: 1.5px solid rgba(100,116,139,0.2); }

        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.8rem; color: #475569; text-decoration: none;
          margin-bottom: 16px; transition: color 0.15s;
        }
        .back-btn:hover { color: #94a3b8; }

        .mvp-win-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
          text-decoration: none; transition: opacity 0.15s;
        }
        .mvp-win-row:last-child { border-bottom: none; }
        .mvp-win-row:hover { opacity: 0.8; }

        .voto-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .voto-row:last-child { border-bottom: none; }

        .colega-row {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .colega-row:last-child { border-bottom: none; }

        .mini-avatar {
          width: 34px; height: 34px;
          border-radius: 50%; object-fit: cover; flex-shrink: 0;
        }
        .mini-placeholder {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Bebas Neue', sans-serif; font-size: 0.9rem; flex-shrink: 0;
        }
        .mini-w { background: rgba(226,232,240,0.08); border: 1px solid rgba(226,232,240,0.15); color: #94a3b8; }
        .mini-b { background: rgba(15,15,15,0.5); border: 1px solid rgba(60,60,60,0.6); color: #64748b; }

        .record-badge {
          display: inline-flex; align-items: center; gap: 5px;
          background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.15);
          border-radius: 10px; padding: 5px 10px;
        }
      `}</style>

      <div className="perfil-page pb-12">
        <a href="/jogadores" className="back-btn">← Jogadores</a>

        {/* Hero */}
        <div style={{
          background: isWhite
            ? 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98))'
            : 'linear-gradient(135deg, rgba(15,15,20,0.98), rgba(10,10,15,0.99))',
          border: isWhite ? '1.5px solid rgba(226,232,240,0.3)' : '1.5px solid rgba(20,20,20,0.95)',
          borderRadius: 20, padding: '20px 16px', marginBottom: 16,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position:'absolute', top:-30, right:-30, width:140, height:140, borderRadius:'50%', background: isWhite ? 'rgba(226,232,240,0.04)' : 'rgba(0,0,0,0.3)', pointerEvents:'none' }} />
          <div style={{display:'flex', alignItems:'center', gap:16}}>
            {player.photo_url
              ? <img src={player.photo_url} alt={player.name} style={{ width:80, height:80, borderRadius:'50%', objectFit:'cover', flexShrink:0, border: isWhite ? '2.5px solid rgba(226,232,240,0.35)' : '2.5px solid rgba(20,20,20,0.9)', boxShadow:'0 4px 20px rgba(0,0,0,0.4)' }} />
              : <div style={{ width:80, height:80, borderRadius:'50%', flexShrink:0, background: isWhite ? 'rgba(226,232,240,0.08)' : 'rgba(20,20,20,0.6)', border: isWhite ? '2.5px solid rgba(226,232,240,0.2)' : '2.5px solid rgba(40,40,40,0.9)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Bebas Neue', sans-serif", fontSize:'2rem', color: isWhite ? '#94a3b8' : '#475569' }}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
            }
            <div style={{flex:1, minWidth:0}}>
              <div style={{ fontSize:'0.65rem', letterSpacing:'0.12em', textTransform:'uppercase', color: isWhite ? 'rgba(226,232,240,0.4)' : 'rgba(100,116,139,0.6)', marginBottom:3, fontWeight:600 }}>
                {isWhite ? '⚪ Equipa Branca' : '⚫ Equipa Preta'}
              </div>
              <div className="display-font" style={{fontSize:'1.8rem', color:'white', lineHeight:1, marginBottom:4}}>
                {player.name}
              </div>
              {player.birth_date && (
                <div style={{fontSize:'0.75rem', color:'#94a3b8'}}>
                  {new Date(player.birth_date).toLocaleDateString('pt-PT', { day:'numeric', month:'long', year:'numeric' })}
                  {idade !== null && <span style={{color:'#94a3b8'}}> ({idade} anos)</span>}
                </div>
              )}
              <div style={{display:'flex', gap:6, flexWrap:'wrap', marginTop:6}}>
                {mvpTotal > 0 && (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:8, padding:'3px 8px' }}>
                    <span style={{fontSize:'0.7rem', color:'#f59e0b', fontWeight:700}}>⭐ {mvpTotal}× MVP</span>
                  </div>
                )}
                {streakType && streakCount >= 2 && (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:4, background:streakBg, border:`1px solid ${streakBorder}`, borderRadius:8, padding:'3px 8px' }}>
                    <span style={{fontSize:'0.7rem', color:streakColor, fontWeight:700}}>
                      {streakCount}× {streakCount === 1 ? streakLabel : streakLabelPlural}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats principais */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:8}}>
          {[
            { val: jogos, lbl: 'Jogos', color: 'white' },
            { val: vitorias, lbl: 'Vitórias', color: '#22c55e' },
            { val: derrotas, lbl: 'Derrotas', color: '#ef4444' },
          ].map(s => (
            <div key={s.lbl} className="stat-block">
              <div className="val" style={{color: s.color}}>{s.val}</div>
              <div className="lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* % Vitória + Assiduidade */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16}}>
          <div className="stat-block">
            <div className="val" style={{fontSize:'1.6rem', color: pct >= 60 ? '#22c55e' : pct >= 40 ? '#f59e0b' : jogos === 0 ? 'white' : '#ef4444'}}>{pct}%</div>
            <div className="lbl">% Vitória</div>
          </div>
          <div className="stat-block">
            <div className="val" style={{fontSize:'1.6rem', color: assiduidade >= 80 ? '#22c55e' : assiduidade >= 50 ? '#f59e0b' : '#ef4444'}}>{assiduidade}%</div>
            <div className="lbl">Assiduidade</div>
            <div style={{fontSize:'0.6rem', color:'#94a3b8', marginTop:2}}>{jogos} de {totalJogos} jogos</div>
          </div>
        </div>

        {/* Forma recente — últimos 10 */}
        {jogos > 0 && (
          <div className="section-card" style={{marginBottom:16}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
              <div className="section-title" style={{marginBottom:0}}>Forma recente</div>
              {streakType && (
                <div style={{ fontSize:'0.65rem', fontWeight:700, color:streakColor, background:streakBg, border:`1px solid ${streakBorder}`, borderRadius:8, padding:'3px 8px' }}>
                  {streakCount} {streakCount === 1 ? streakLabel : streakLabelPlural} seguida{streakCount > 1 ? 's' : ''}
                </div>
              )}
            </div>
            <div style={{display:'flex', gap:6, alignItems:'center', flexWrap:'wrap'}}>
              {forma.map((res, i) => (
                <div key={i} className={`forma-dot forma-${res}`}>{res}</div>
              ))}
              {forma.length === 0 && <span style={{fontSize:'0.8rem', color:'#94a3b8'}}>Sem jogos</span>}
            </div>
            {jogos > 10 && (
              <div style={{fontSize:'0.65rem', color:'#94a3b8', marginTop:8}}>← últimos {forma.length} de {jogos} jogos</div>
            )}
          </div>
        )}

        {/* Liga vs Taça */}
        <div className="section-card" style={{marginBottom:16}}>
          <div className="section-title">Por competição</div>
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            {[
              { label:'👑 Campeonato', jogos: jogosLiga.length, vitorias: vitoriasLiga },
              { label:'🏆 Taça', jogos: jogosTaca.length, vitorias: vitoriasTaca },
            ].map(c => {
              const p = c.jogos > 0 ? Math.round((c.vitorias / c.jogos) * 100) : 0
              return (
                <div key={c.label}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:5}}>
                    <span style={{fontSize:'0.8rem', color:'#e2e8f0', fontWeight:600}}>{c.label}</span>
                    <span style={{fontSize:'0.8rem', color:'#94a3b8'}}>{c.vitorias}V / {c.jogos}J
                      {c.jogos > 0 && <span style={{color: p>=60?'#22c55e':p>=40?'#f59e0b':'#ef4444', marginLeft:6, fontWeight:700}}>{p}%</span>}
                    </span>
                  </div>
                  <div style={{height:5, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden'}}>
                    <div style={{height:'100%', width:`${p}%`, borderRadius:99, background: p>=60?'linear-gradient(90deg,#22c55e,#16a34a)':p>=40?'linear-gradient(90deg,#f59e0b,#d97706)':'linear-gradient(90deg,#ef4444,#b91c1c)'}} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Colegas mais frequentes — NOVO */}
        {colegasMaisFrequentes.length > 0 && (
          <div className="section-card" style={{marginBottom:16}}>
            <div className="section-title">🤝 Colega com quem mais jogas</div>
            <div>
              {colegasMaisFrequentes.map((item, i) => {
                const pctJuntos = jogos > 0 ? Math.round((item.count / jogos) * 100) : 0
                const isCand = item.player?.team === 'white'
                return (
                  <a key={item.player?.id || i} href={`/jogadores/${item.player?.id}`} className="colega-row" style={{textDecoration:'none'}}>
                    {item.player?.photo_url
                      ? <img src={item.player.photo_url} alt={item.player.name} className="mini-avatar" style={{border: isCand ? '1px solid rgba(226,232,240,0.2)' : '1px solid rgba(40,40,40,0.8)'}} />
                      : <div className={`mini-placeholder ${isCand ? 'mini-w' : 'mini-b'}`}>{item.player?.name?.charAt(0).toUpperCase()}</div>
                    }
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4}}>
                        <span style={{fontSize:'0.82rem', fontWeight:600, color:'#e2e8f0'}}>{item.player?.name}</span>
                        <span style={{fontSize:'0.72rem', color:'#94a3b8', flexShrink:0, marginLeft:8}}>{item.count} jogos juntos</span>
                      </div>
                      <div style={{height:3, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden'}}>
                        <div style={{height:'100%', width:`${pctJuntos}%`, borderRadius:99, background:'linear-gradient(90deg, rgba(99,102,241,0.6), rgba(99,102,241,0.3))'}} />
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        )}

        {/* Histórico completo */}
        {jogosOrdenados.length > 0 && (
          <div className="section-card" style={{marginBottom:16}}>
            <div className="section-title">Histórico de jogos jogados por mim ({jogosOrdenados.length})</div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {jogosOrdenados.map((mp, i) => {
                const m = mp.matches
                const ganhou = mp.played_for==='white' ? m.white_wins>m.black_wins : m.black_wins>m.white_wins
                const perdeu = mp.played_for==='white' ? m.white_wins<m.black_wins : m.black_wins<m.white_wins
                const res = ganhou?'V':perdeu?'D':'E'
                const resClass = ganhou?'resultado-v':perdeu?'resultado-d':'resultado-e'
                return (
                  <div key={i} style={{display:'flex', alignItems:'center', gap:10}}>
                    <div className={`resultado-pill ${resClass}`}>{res}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'0.8rem', color:'#e2e8f0', fontWeight:500}}>
                        {m.phase==='cup'?'🏆 Taça':'👑 Camp.'} · Série {m.series?.id}
                        {m.match_number ? ` · ${labelJornada(m)}` : ''}
                      </div>
                      <div style={{fontSize:'0.7rem', color:'#94a3b8'}}>
                        {new Date(m.date).toLocaleDateString('pt-PT', { day:'numeric', month:'short', year:'numeric' })}
                      </div>
                    </div>
                    <div style={{fontSize:'0.85rem', fontWeight:700, color:'white', background:'rgba(255,255,255,0.06)', padding:'4px 10px', borderRadius:8}}>
                      {m.white_wins} — {m.black_wins}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {jogos === 0 && (
          <div style={{textAlign:'center', color:'#94a3b8', fontSize:'0.85rem', padding:'24px 0'}}>
            Ainda sem jogos registados.
          </div>
        )}

        {/* Vitórias MVP */}
        {mvpTotal > 0 && (
          <div className="section-card" style={{marginBottom:16}}>
            <div className="section-title">⭐ Vitórias MVP ({mvpTotal})</div>
            <div>
              {mvpWins.map((win) => (
                <a key={win.matchId} href={`/mvp/${win.matchId}`} className="mvp-win-row">
                  <div style={{width:32, height:32, borderRadius:8, background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', flexShrink:0}}>⭐</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'0.8rem', color:'#e2e8f0', fontWeight:500}}>
                      {win.match?.phase==='cup'?'🏆 Taça':'👑 Camp.'} · Série {win.match?.series_id}
                      {win.match?.match_number ? ` · ${labelJornada(win.match)}` : ''}
                    </div>
                    <div style={{fontSize:'0.7rem', color:'#94a3b8'}}>
                      {win.match?.date ? new Date(win.match.date).toLocaleDateString('pt-PT', { day:'numeric', month:'short', year:'numeric' }) : ''}
                    </div>
                  </div>
                  <div style={{fontSize:'0.75rem', fontWeight:700, color:'#f59e0b', background:'rgba(251,191,36,0.08)', padding:'3px 8px', borderRadius:8, flexShrink:0}}>
                    {win.votos} {win.votos===1?'voto':'votos'} →
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Votos dados */}
        {votosDadosOrdenados.length > 0 && (
          <div className="section-card" style={{marginBottom:16}}>
            <div className="section-title">🗳️ Votos dados ({votesGivenFiltered?.length || 0})</div>
            <div>
              {votosDadosOrdenados.map((item, i) => {
                const pctVotos = Math.round((item.count / (votesGivenFiltered?.length || 1)) * 100)
                const isCand = item.player?.team === 'white'
                return (
                  <div key={item.player?.id || i} className="voto-row">
                    {item.player?.photo_url
                      ? <img src={item.player.photo_url} alt={item.player.name} className="mini-avatar" style={{border: isCand ? '1px solid rgba(226,232,240,0.2)' : '1px solid rgba(40,40,40,0.8)'}} />
                      : <div className={`mini-placeholder ${isCand?'mini-w':'mini-b'}`}>{item.player?.name?.charAt(0).toUpperCase()}</div>
                    }
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4}}>
                        <span style={{fontSize:'0.82rem', fontWeight:600, color:'#e2e8f0'}}>{item.player?.name}</span>
                        <span style={{fontSize:'0.72rem', color:'#94a3b8', flexShrink:0, marginLeft:8}}>{item.count}× <span style={{color:'#94a3b8'}}>({pctVotos}%)</span></span>
                      </div>
                      <div style={{height:3, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden'}}>
                        <div style={{height:'100%', width:`${pctVotos}%`, borderRadius:99, background:'linear-gradient(90deg, rgba(251,191,36,0.6), rgba(251,191,36,0.3))'}} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
