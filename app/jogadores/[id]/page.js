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
          id,
          date,
          white_wins,
          black_wins,
          phase,
          match_number,
          series (id)
        )
      )
    `)
    .eq('id', params.id)
    .single()

  if (!player) notFound()

  // Votos recebidos por este jogador (para saber em que jogos foi votado)
  const { data: votesReceived } = await supabase
    .from('mvp_votes')
    .select('match_id, voted_at, matches(date, phase, match_number, series_id)')
    .eq('voted_for_player_id', params.id)
    .order('voted_at', { ascending: false })

  // IDs dos jogos onde este jogador recebeu votos
  const matchIdsWithVotes = [...new Set(votesReceived?.map(v => v.match_id) || [])]

  // Para cada um desses jogos, buscar todos os votos para determinar o vencedor
  let mvpWins = []
  if (matchIdsWithVotes.length > 0) {
    const { data: allVotesInMatches } = await supabase
      .from('mvp_votes')
      .select('match_id, voted_for_player_id')
      .in('match_id', matchIdsWithVotes)

    // Agrupar por jogo e verificar se este jogador ganhou
    const votesByMatch = {}
    allVotesInMatches?.forEach(v => {
      if (!votesByMatch[v.match_id]) votesByMatch[v.match_id] = {}
      votesByMatch[v.match_id][v.voted_for_player_id] = (votesByMatch[v.match_id][v.voted_for_player_id] || 0) + 1
    })

    mvpWins = Object.entries(votesByMatch)
      .filter(([, matchVotes]) => {
        const sorted = Object.entries(matchVotes).sort((a, b) => b[1] - a[1])
        return sorted[0]?.[0] === params.id
      })
      .map(([matchId, matchVotes]) => {
        const matchInfo = votesReceived?.find(v => String(v.match_id) === matchId)
        return {
          matchId,
          match: matchInfo?.matches,
          votos: matchVotes[params.id] || 0,
        }
      })
      .sort((a, b) => new Date(b.match?.date || 0) - new Date(a.match?.date || 0))
  }

  // Estatísticas gerais
  const comResultado = player.match_players?.filter(
    mp => mp.matches?.white_wins !== null && mp.matches?.black_wins !== null
  ) || []

  const jogos = comResultado.length
  const vitorias = comResultado.filter(mp => {
    if (mp.played_for === 'white') return mp.matches.white_wins > mp.matches.black_wins
    if (mp.played_for === 'black') return mp.matches.black_wins > mp.matches.white_wins
    return false
  }).length
  const derrotas = comResultado.filter(mp => {
    if (mp.played_for === 'white') return mp.matches.white_wins < mp.matches.black_wins
    if (mp.played_for === 'black') return mp.matches.black_wins < mp.matches.white_wins
    return false
  }).length
  const empates = jogos - vitorias - derrotas
  const pct = jogos > 0 ? Math.round((vitorias / jogos) * 100) : 0
  const mvpTotal = mvpWins.length  // vitórias MVP, não total de votos

  const jogosLiga = comResultado.filter(mp => mp.matches.phase === 'league')
  const jogosTaca = comResultado.filter(mp => mp.matches.phase === 'cup')
  const vitoriasLiga = jogosLiga.filter(mp =>
    mp.played_for === 'white' ? mp.matches.white_wins > mp.matches.black_wins : mp.matches.black_wins > mp.matches.white_wins
  ).length
  const vitoriasTaca = jogosTaca.filter(mp =>
    mp.played_for === 'white' ? mp.matches.white_wins > mp.matches.black_wins : mp.matches.black_wins > mp.matches.white_wins
  ).length

  // Últimos 5 jogos
  const ultimos5 = [...comResultado]
    .sort((a, b) => new Date(b.matches.date) - new Date(a.matches.date))
    .slice(0, 5)

  const idade = calcIdade(player.birth_date)
  const isWhite = player.team === 'white'

  const labelJornada = (m) => {
    if (!m?.match_number) return null
    return m.phase === 'cup' ? `Jogo ${m.match_number}` : `Jorn. ${m.match_number}`
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        .perfil-page { font-family: 'DM Sans', sans-serif; }
        .display-font { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }

        .stat-block {
          background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98));
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
          color: #475569;
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
          color: #64748b;
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

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: #475569;
          text-decoration: none;
          margin-bottom: 16px;
          transition: color 0.15s;
        }
        .back-btn:hover { color: #94a3b8; }

        .mvp-win-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          text-decoration: none;
          transition: opacity 0.15s;
        }
        .mvp-win-row:last-child { border-bottom: none; }
        .mvp-win-row:hover { opacity: 0.8; }
      `}</style>

      <div className="perfil-page pb-12">
        <a href="/jogadores" className="back-btn">← Jogadores</a>

        {/* Hero — foto + nome + info */}
        <div style={{
          background: isWhite
            ? 'linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98))'
            : 'linear-gradient(135deg, rgba(15,15,20,0.98), rgba(10,10,15,0.99))',
          border: isWhite ? '1.5px solid rgba(226,232,240,0.3)' : '1.5px solid rgba(20,20,20,0.95)',
          borderRadius: 20,
          padding: '20px 16px',
          marginBottom: 16,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: -30, right: -30,
            width: 140, height: 140, borderRadius: '50%',
            background: isWhite ? 'rgba(226,232,240,0.04)' : 'rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }} />

          <div style={{display:'flex', alignItems:'center', gap:16}}>
            {player.photo_url
              ? <img src={player.photo_url} alt={player.name} style={{
                  width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                  border: isWhite ? '2.5px solid rgba(226,232,240,0.35)' : '2.5px solid rgba(20,20,20,0.9)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }} />
              : <div style={{
                  width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
                  background: isWhite ? 'rgba(226,232,240,0.08)' : 'rgba(20,20,20,0.6)',
                  border: isWhite ? '2.5px solid rgba(226,232,240,0.2)' : '2.5px solid rgba(40,40,40,0.9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem',
                  color: isWhite ? '#94a3b8' : '#475569',
                }}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
            }

            <div style={{flex:1, minWidth:0}}>
              <div style={{
                fontSize: '0.65rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                color: isWhite ? 'rgba(226,232,240,0.4)' : 'rgba(100,116,139,0.6)',
                marginBottom: 3, fontWeight: 600,
              }}>
                {isWhite ? '⚪ Equipa Branca' : '⚫ Equipa Preta'}
              </div>
              <div className="display-font" style={{fontSize:'1.8rem', color:'white', lineHeight:1, marginBottom:4}}>
                {player.name}
              </div>
              {player.birth_date && (
                <div style={{fontSize:'0.75rem', color:'#475569'}}>
                  {new Date(player.birth_date).toLocaleDateString('pt-PT', { day:'numeric', month:'long', year:'numeric' })}
                  {idade !== null && <span style={{color:'#64748b'}}> ({idade} anos)</span>}
                </div>
              )}
              {mvpTotal > 0 && (
                <div style={{marginTop:6, display:'inline-flex', alignItems:'center', gap:4,
                  background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)',
                  borderRadius:8, padding:'3px 8px'}}>
                  <span style={{fontSize:'0.7rem', color:'#f59e0b', fontWeight:700}}>⭐ {mvpTotal}× MVP</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats principais */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16}}>
          {[
            { val: jogos, lbl: 'Jogos' },
            { val: vitorias, lbl: 'Vitórias' },
            { val: derrotas, lbl: 'Derrotas' },
            { val: `${pct}%`, lbl: 'Taxa V.' },
          ].map(s => (
            <div key={s.lbl} className="stat-block" style={{border:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="val" style={{fontSize: s.lbl === 'Taxa V.' ? '1.6rem' : '2.2rem',
                color: s.lbl === 'Taxa V.' ? (pct >= 60 ? '#22c55e' : pct >= 40 ? '#f59e0b' : jogos === 0 ? 'white' : '#ef4444') : 'white'
              }}>{s.val}</div>
              <div className="lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Liga vs Taça */}
        <div className="section-card" style={{marginBottom:16}}>
          <div className="section-title">Por competição</div>
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            {[
              { label: '👑 Campeonato', jogos: jogosLiga.length, vitorias: vitoriasLiga },
              { label: '🏆 Taça', jogos: jogosTaca.length, vitorias: vitoriasTaca },
            ].map(c => {
              const p = c.jogos > 0 ? Math.round((c.vitorias / c.jogos) * 100) : 0
              return (
                <div key={c.label}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:5}}>
                    <span style={{fontSize:'0.8rem', color:'#94a3b8', fontWeight:600}}>{c.label}</span>
                    <span style={{fontSize:'0.8rem', color:'#64748b'}}>{c.vitorias}V / {c.jogos}J
                      {c.jogos > 0 && <span style={{color: p >= 60 ? '#22c55e' : p >= 40 ? '#f59e0b' : '#ef4444', marginLeft:6, fontWeight:700}}>{p}%</span>}
                    </span>
                  </div>
                  <div style={{height:5, background:'rgba(255,255,255,0.06)', borderRadius:99, overflow:'hidden'}}>
                    <div style={{height:'100%', width:`${p}%`, borderRadius:99,
                      background: p >= 60 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : p >= 40 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#b91c1c)'
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Últimos 5 jogos */}
        {ultimos5.length > 0 && (
          <div className="section-card" style={{marginBottom:16}}>
            <div className="section-title">Últimos jogos</div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {ultimos5.map((mp, i) => {
                const m = mp.matches
                const ganhou = mp.played_for === 'white' ? m.white_wins > m.black_wins : m.black_wins > m.white_wins
                const perdeu = mp.played_for === 'white' ? m.white_wins < m.black_wins : m.black_wins < m.white_wins
                const res = ganhou ? 'V' : perdeu ? 'D' : 'E'
                const resClass = ganhou ? 'resultado-v' : perdeu ? 'resultado-d' : 'resultado-e'
                return (
                  <div key={i} style={{display:'flex', alignItems:'center', gap:10}}>
                    <div className={`resultado-pill ${resClass}`}>{res}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'0.8rem', color:'#cbd5e1', fontWeight:500}}>
                        {m.phase === 'cup' ? '🏆 Taça' : '👑 Camp.'} · Série {m.series?.id}
                        {m.match_number ? ` · ${labelJornada(m)}` : ''}
                      </div>
                      <div style={{fontSize:'0.7rem', color:'#475569'}}>
                        {new Date(m.date).toLocaleDateString('pt-PT', { day:'numeric', month:'short', year:'numeric' })}
                      </div>
                    </div>
                    <div style={{fontSize:'0.85rem', fontWeight:700, color:'white',
                      background:'rgba(255,255,255,0.06)', padding:'4px 10px', borderRadius:8}}>
                      {m.white_wins} — {m.black_wins}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {jogos === 0 && (
          <div style={{textAlign:'center', color:'#334155', fontSize:'0.85rem', padding:'24px 0'}}>
            Ainda sem jogos registados.
          </div>
        )}

        {/* MVP Wins — jogos em que ganhou o MVP */}
        {mvpTotal > 0 && (
          <div className="section-card" style={{marginBottom:16}}>
            <div className="section-title">⭐ Vitórias MVP ({mvpTotal})</div>
            <div>
              {mvpWins.map((win) => (
                <a key={win.matchId} href={`/mvp/${win.matchId}`} className="mvp-win-row">
                  <div style={{width:32, height:32, borderRadius:8, background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.85rem', flexShrink:0}}>
                    ⭐
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'0.8rem', color:'#cbd5e1', fontWeight:500}}>
                      {win.match?.phase === 'cup' ? '🏆 Taça' : '👑 Camp.'} · Série {win.match?.series_id}
                      {win.match?.match_number ? ` · ${labelJornada(win.match)}` : ''}
                    </div>
                    <div style={{fontSize:'0.7rem', color:'#475569'}}>
                      {win.match?.date ? new Date(win.match.date).toLocaleDateString('pt-PT', { day:'numeric', month:'short', year:'numeric' }) : ''}
                    </div>
                  </div>
                  <div style={{fontSize:'0.75rem', fontWeight:700, color:'#f59e0b', background:'rgba(251,191,36,0.08)', padding:'3px 8px', borderRadius:8, flexShrink:0}}>
                    {win.votos} {win.votos === 1 ? 'voto' : 'votos'} →
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
