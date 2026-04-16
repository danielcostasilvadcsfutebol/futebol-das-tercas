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
          border-radius: 16px;
          transition: transform 0.15s ease;
          position: relative;
          overflow: hidden;
        }
        .card-player:active { transform: scale(0.985); }

        /* Rebordo branco para equipa branca */
        .card-white {
          border: 1.5px solid rgba(226,232,240,0.35);
          box-shadow: 0 0 0 0.5px rgba(255,255,255,0.06) inset;
        }
        /* Rebordo preto/escuro para equipa preta */
        .card-black {
          border: 1.5px solid rgba(30,30,30,0.9);
          box-shadow: 0 0 0 0.5px rgba(0,0,0,0.4) inset, 0 1px 0 rgba(255,255,255,0.04) inset;
        }

        .avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }
        .avatar-placeholder {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.15rem;
          flex-shrink: 0;
        }
        .avatar-white { background: rgba(226,232,240,0.1); border: 1.5px solid rgba(226,232,240,0.2); color: #94a3b8; }
        .avatar-black { background: rgba(15,15,15,0.6); border: 1.5px solid rgba(60,60,60,0.8); color: #64748b; }

        .stat-pill {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 5px 9px;
          text-align: center;
          flex: 1;
        }
        .stat-pill .val {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.3rem;
          line-height: 1;
          color: white;
        }
        .stat-pill .lbl {
          font-size: 0.58rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 2px;
        }

        .pct-bar-bg {
          height: 3px;
          background: rgba(255,255,255,0.07);
          border-radius: 99px;
          overflow: hidden;
          margin-top: 7px;
        }
        .pct-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #22c55e, #16a34a); }
        .pct-bar-fill.low { background: linear-gradient(90deg, #ef4444, #b91c1c); }
        .pct-bar-fill.mid { background: linear-gradient(90deg, #f59e0b, #d97706); }

        .rank-num {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1rem;
          color: #334155;
          width: 18px;
          text-align: center;
          flex-shrink: 0;
        }
        .rank-1 { color: #f59e0b; }
        .rank-2 { color: #94a3b8; }
        .rank-3 { color: #b45309; }

        .section-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1rem;
          letter-spacing: 0.1em;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 10px;
          padding-left: 2px;
        }

        .mvp-card {
          background: linear-gradient(135deg, #1c1917 0%, #0f172a 100%);
          border: 1px solid rgba(251,191,36,0.25);
          border-radius: 16px;
          padding: 14px 16px;
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

        {/* MVP destaque */}
        {topMvp && topMvp.stats.mvp > 0 && (
          <div className="mvp-card">
            <div style={{fontSize:'0.65rem', color:'#f59e0b', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:700, marginBottom:8}}>⭐ Melhor em Campo</div>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              {topMvp.photo_url
                ? <img src={topMvp.photo_url} alt={topMvp.name} className="avatar" style={{border:'2px solid rgba(251,191,36,0.4)'}} />
                : <div className="avatar-placeholder" style={{background:'rgba(251,191,36,0.1)', border:'2px solid rgba(251,191,36,0.3)', color:'#f59e0b', fontSize:'1.3rem'}}>
                    {topMvp.name.charAt(0).toUpperCase()}
                  </div>
              }
              <div style={{flex:1}}>
                <div style={{fontSize:'1.2rem', fontWeight:700, color:'white', lineHeight:1}}>{topMvp.name}</div>
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

        {/* Ranking */}
        <div>
          <div className="section-title">🏆 Ranking — % Vitórias</div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {todosAtivos.map((player, idx) => {
              const { jogos, vitorias, pct, mvp } = player.stats
              const pctClass = pct >= 60 ? '' : pct >= 40 ? 'mid' : 'low'
              const isWhite = player.team === 'white'
              return (
                <div key={player.id} className={`card-player ${isWhite ? 'card-white' : 'card-black'}`} style={{padding:'12px 12px'}}>
                  <div style={{display:'flex', alignItems:'center', gap:9}}>
                    <span className={`rank-num rank-${idx+1}`}>{idx + 1}</span>

                    {/* Avatar */}
                    {player.photo_url
                      ? <img src={player.photo_url} alt={player.name} className={`avatar ${isWhite ? 'avatar-white' : 'avatar-black'}`}
                          style={{border: isWhite ? '2px solid rgba(226,232,240,0.25)' : '2px solid rgba(30,30,30,0.9)'}} />
                      : <div className={`avatar-placeholder ${isWhite ? 'avatar-white' : 'avatar-black'}`}>
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                    }

                    <div style={{flex:1, minWidth:0}}>
                      <div style={{display:'flex', alignItems:'center', gap:5, marginBottom:2, flexWrap:'wrap'}}>
                        <span style={{fontWeight:700, fontSize:'0.95rem', color:'white'}}>{player.name}</span>
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
                  gap:10,
                  opacity:0.45
                }}>
                  {player.photo_url
                    ? <img src={player.photo_url} alt={player.name} style={{width:32, height:32, borderRadius:'50%', objectFit:'cover', flexShrink:0}} />
                    : <div style={{width:32, height:32, borderRadius:'50%', background:'rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', color:'#334155', flexShrink:0}}>
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                  }
                  <span style={{fontSize:'0.85rem', color:'#475569', textDecoration:'line-through', flex:1}}>{player.name}</span>
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
