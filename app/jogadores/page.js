import { supabase } from '../lib/supabase'

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

  // Conta votos MVP por jogador
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        .jogadores-page { font-family: 'DM Sans', sans-serif; }
        .display-font { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }
        .card-player {
          background: linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.98) 100%);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          transition: transform 0.15s ease;
          position: relative;
          overflow: hidden;
        }
        .card-player::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
        }
        .card-white::before { background: linear-gradient(90deg, transparent, rgba(148,163,184,0.5), transparent); }
        .card-black::before { background: linear-gradient(90deg, transparent, rgba(100,116,139,0.3), transparent); }
        .card-player:active { transform: scale(0.985); }
        .stat-pill {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 6px 10px;
          text-align: center;
          flex: 1;
        }
        .stat-pill .val {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.35rem;
          line-height: 1;
          color: white;
        }
        .stat-pill .lbl {
          font-size: 0.6rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 2px;
        }
        .pct-bar-bg {
          height: 4px;
          background: rgba(255,255,255,0.07);
          border-radius: 99px;
          overflow: hidden;
          margin-top: 8px;
        }
        .pct-bar-fill {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, #22c55e, #16a34a);
        }
        .pct-bar-fill.low { background: linear-gradient(90deg, #ef4444, #b91c1c); }
        .pct-bar-fill.mid { background: linear-gradient(90deg, #f59e0b, #d97706); }
        .team-badge {
          font-size: 0.6rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 2px 7px;
          border-radius: 99px;
          font-weight: 600;
        }
        .badge-white { background: rgba(226,232,240,0.12); color: #cbd5e1; }
        .badge-black { background: rgba(100,116,139,0.2); color: #94a3b8; }
        .rank-num {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.1rem;
          color: #334155;
          width: 22px;
          text-align: center;
          flex-shrink: 0;
        }
        .rank-1 { color: #f59e0b; }
        .rank-2 { color: #94a3b8; }
        .rank-3 { color: #b45309; }
        .section-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.05rem;
          letter-spacing: 0.1em;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 10px;
          padding-left: 4px;
        }
        .hero-stat { text-align: center; padding: 12px 0; }
        .hero-stat .big {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 3.5rem;
          line-height: 1;
          background: linear-gradient(135deg, #fff 30%, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-stat .sub { font-size: 0.7rem; color: #475569; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px; }
        .mvp-card {
          background: linear-gradient(135deg, #1c1917 0%, #0f172a 100%);
          border: 1px solid rgba(251,191,36,0.25);
          border-radius: 16px;
          padding: 16px;
          position: relative;
          overflow: hidden;
        }
        .mvp-card::after {
          content: '★';
          position: absolute;
          right: -4px; top: -8px;
          font-size: 5rem;
          opacity: 0.05;
          transform: rotate(15deg);
          color: #f59e0b;
        }
      `}</style>

      <div className="jogadores-page space-y-5 pb-12">

        {/* Header */}
        <div className="pt-3 pb-1">
          <h1 className="display-font text-4xl text-white mb-0.5">Jogadores</h1>
          <p style={{fontSize:'0.8rem', color:'#475569'}}>Estatísticas individuais da temporada</p>
        </div>

        {/* Resumo geral */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(30,41,59,0.9), rgba(15,23,42,0.95))',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          padding: '4px 16px',
        }}>
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <div className="hero-stat" style={{flex:1, borderRight:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="big">{todosAtivos.length}</div>
              <div className="sub">Jogadores</div>
            </div>
            <div className="hero-stat" style={{flex:1, borderRight:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="big">{todosAtivos.reduce((s,p) => s + p.stats.jogos, 0)}</div>
              <div className="sub">Presenças</div>
            </div>
            <div className="hero-stat" style={{flex:1}}>
              <div className="big">{Object.values(mvpCount).reduce((s,v) => s+v, 0)}</div>
              <div className="sub">Votos MVP</div>
            </div>
          </div>
        </div>

        {/* MVP destaque */}
        {topMvp && topMvp.stats.mvp > 0 && (
          <div className="mvp-card">
            <div style={{fontSize:'0.65rem', color:'#f59e0b', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:700, marginBottom:6}}>⭐ Melhor em Campo</div>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:'1.3rem', fontWeight:700, color:'white', lineHeight:1}}>{topMvp.name}</div>
                <div style={{fontSize:'0.7rem', color:'#78716c', marginTop:3}}>
                  {topMvp.stats.mvp} {topMvp.stats.mvp === 1 ? 'voto' : 'votos'} · {topMvp.stats.jogos} jogos · {topMvp.stats.pct}% vitórias
                </div>
              </div>
              <div style={{
                fontFamily:"'Bebas Neue', sans-serif",
                fontSize:'2.8rem',
                color:'#f59e0b',
                lineHeight:1,
                textShadow:'0 0 30px rgba(251,191,36,0.3)'
              }}>{topMvp.stats.mvp}</div>
            </div>
          </div>
        )}

        {/* Ranking geral */}
        <div>
          <div className="section-title">🏆 Ranking — % Vitórias</div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {todosAtivos.map((player, idx) => {
              const { jogos, vitorias, pct, mvp } = player.stats
              const pctClass = pct >= 60 ? '' : pct >= 40 ? 'mid' : 'low'
              return (
                <div key={player.id} className={`card-player ${player.team === 'white' ? 'card-white' : 'card-black'}`} style={{padding:'12px 14px'}}>
                  <div style={{display:'flex', alignItems:'center', gap:10}}>
                    <span className={`rank-num rank-${idx+1}`}>{idx + 1}</span>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:2, flexWrap:'wrap'}}>
                        <span style={{fontWeight:700, fontSize:'0.95rem', color:'white'}}>{player.name}</span>
                        <span className={`team-badge ${player.team === 'white' ? 'badge-white' : 'badge-black'}`}>
                          {player.team === 'white' ? '⚪' : '⚫'}
                        </span>
                        {mvp > 0 && <span style={{fontSize:'0.65rem', color:'#f59e0b', fontWeight:600}}>⭐ ×{mvp}</span>}
                      </div>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <span style={{fontSize:'0.65rem', color:'#475569'}}>{jogos}J · {vitorias}V</span>
                        <span style={{fontSize:'0.75rem', fontWeight:700, color: pct >= 60 ? '#22c55e' : pct >= 40 ? '#f59e0b' : jogos === 0 ? '#334155' : '#ef4444'}}>
                          {jogos > 0 ? `${pct}%` : '— sem jogos'}
                        </span>
                      </div>
                      {jogos > 0 && (
                        <div className="pct-bar-bg">
                          <div className={`pct-bar-fill ${pctClass}`} style={{width:`${pct}%`}}></div>
                        </div>
                      )}
                    </div>
                    <div style={{display:'flex', gap:5, flexShrink:0}}>
                      <div className="stat-pill">
                        <div className="val">{jogos}</div>
                        <div className="lbl">Jogos</div>
                      </div>
                      <div className="stat-pill">
                        <div className="val">{vitorias}</div>
                        <div className="lbl">Vit.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {todosAtivos.length === 0 && (
              <p style={{textAlign:'center', color:'#475569', fontSize:'0.85rem', padding:'24px 0'}}>Nenhum jogador ativo.</p>
            )}
          </div>
        </div>

        {/* Inativos */}
        {inativos.length > 0 && (
          <div>
            <div className="section-title" style={{color:'#334155'}}>Inativos</div>
            <div style={{display:'flex', flexDirection:'column', gap:6}}>
              {inativos.map(player => (
                <div key={player.id} style={{
                  background:'rgba(15,23,42,0.5)',
                  border:'1px solid rgba(255,255,255,0.04)',
                  borderRadius:12,
                  padding:'10px 14px',
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'space-between',
                  opacity:0.5
                }}>
                  <span style={{fontSize:'0.85rem', color:'#475569', textDecoration:'line-through'}}>{player.name}</span>
                  <span style={{fontSize:'0.6rem', color:'#334155', background:'rgba(255,255,255,0.04)', padding:'2px 6px', borderRadius:6}}>Inativo</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
