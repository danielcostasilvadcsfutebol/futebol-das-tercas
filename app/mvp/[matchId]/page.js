import { supabase } from '../../lib/supabase'
import { notFound } from 'next/navigation'

export const revalidate = 0

export default async function MvpDetalhe({ params }) {
  const matchId = params.matchId

  // Info do jogo
  const { data: match } = await supabase
    .from('matches')
    .select('id, date, phase, match_number, series_id, voting_open')
    .eq('id', matchId)
    .single()

  if (!match) notFound()

  // Não revelar resultados enquanto a votação está aberta
  if (match.voting_open) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
          .mvp-page { font-family: 'DM Sans', sans-serif; }
          .display-font { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }
        `}</style>
        <div className="mvp-page" style={{textAlign:'center', padding:'60px 20px'}}>
          <div style={{fontSize:'3rem', marginBottom:16}}>🗳️</div>
          <div className="display-font" style={{fontSize:'1.8rem', color:'white', marginBottom:8}}>
            Votação em curso
          </div>
          <p style={{fontSize:'0.85rem', color:'#475569'}}>
            Os resultados ficam disponíveis após o encerramento da votação.
          </p>
          <a href="/" style={{display:'inline-block', marginTop:24, fontSize:'0.8rem', color:'#475569', textDecoration:'none'}}>
            ← Início
          </a>
        </div>
      </>
    )
  }

  // Todos os votos deste jogo com informação de quem votou e em quem
  const { data: votes } = await supabase
    .from('mvp_votes')
    .select(`
      voter_player_id,
      voted_for_player_id,
      voted_at,
      voter:players!mvp_votes_voter_player_id_fkey(id, name, photo_url, team),
      candidate:players!mvp_votes_voted_for_player_id_fkey(id, name, photo_url, team)
    `)
    .eq('match_id', matchId)
    .order('voted_at', { ascending: true })

  if (!votes || votes.length === 0) notFound()

  const countByCandidato = {}
  votes.forEach(v => {
    const cid = v.voted_for_player_id
    if (!countByCandidato[cid]) {
      countByCandidato[cid] = { player: v.candidate, count: 0, firstVotedAt: v.voted_at }
    }
    countByCandidato[cid].count++
    // Guardar o voto mais antigo para desempate
    if (v.voted_at < countByCandidato[cid].firstVotedAt) {
      countByCandidato[cid].firstVotedAt = v.voted_at
    }
  })

  const candidatosOrdenados = Object.values(countByCandidato).sort((a, b) =>
    b.count - a.count || new Date(a.firstVotedAt) - new Date(b.firstVotedAt)
  )
  const mvpPlayer = candidatosOrdenados[0]
  const outrosCandidatos = candidatosOrdenados.slice(1)
  const totalVotos = votes.length

  const labelJornada = (m) => {
    if (!m?.match_number) return null
    return m.phase === 'cup' ? `Jogo ${m.match_number}` : `Jornada ${m.match_number}`
  }

  const labelComp = (m) => m?.phase === 'cup' ? '🏆 Taça' : '👑 Camp.'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        .mvp-page { font-family: 'DM Sans', sans-serif; }
        .display-font { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }

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

        .section-card {
          background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98));
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 16px;
        }
        .section-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 0.9rem;
          letter-spacing: 0.12em;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .mvp-hero {
          background: linear-gradient(135deg, #1c1917 0%, #0f172a 100%);
          border: 1px solid rgba(251,191,36,0.3);
          border-radius: 20px;
          padding: 20px 16px;
          position: relative;
          overflow: hidden;
          text-align: center;
        }
        .mvp-hero::before {
          content: '★';
          position: absolute;
          right: -10px;
          top: -10px;
          font-size: 8rem;
          opacity: 0.04;
          color: #f59e0b;
          transform: rotate(15deg);
          pointer-events: none;
        }

        .mvp-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(251,191,36,0.5);
          box-shadow: 0 0 30px rgba(251,191,36,0.2);
          margin: 0 auto 10px;
          display: block;
        }
        .mvp-avatar-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(251,191,36,0.1);
          border: 3px solid rgba(251,191,36,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2rem;
          color: #f59e0b;
          margin: 0 auto 10px;
        }

        .vote-bar-bg {
          height: 5px;
          background: rgba(255,255,255,0.06);
          border-radius: 99px;
          overflow: hidden;
          margin-top: 6px;
        }
        .vote-bar-fill {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, #f59e0b, #d97706);
        }
        .vote-bar-fill-other {
          background: linear-gradient(90deg, #475569, #334155);
        }

        .voter-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .voter-row:last-child { border-bottom: none; }

        .mini-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }
        .mini-avatar-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 0.85rem;
          flex-shrink: 0;
        }
        .mini-w { background: rgba(226,232,240,0.08); border: 1px solid rgba(226,232,240,0.12); color: #94a3b8; }
        .mini-b { background: rgba(15,15,15,0.5); border: 1px solid rgba(60,60,60,0.6); color: #64748b; }

        .arrow-icon {
          font-size: 0.7rem;
          color: #334155;
          flex-shrink: 0;
        }

        .candidate-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(251,191,36,0.08);
          border: 1px solid rgba(251,191,36,0.15);
          border-radius: 8px;
          padding: 2px 7px;
          font-size: 0.72rem;
          font-weight: 600;
          color: #f59e0b;
        }
        .candidate-chip-other {
          background: rgba(71,85,105,0.15);
          border-color: rgba(71,85,105,0.2);
          color: #64748b;
        }
      `}</style>

      <div className="mvp-page pb-12">
        <a href="/" className="back-btn">← Início</a>

        {/* Hero — MVP vencedor */}
        <div className="mvp-hero" style={{marginBottom:16}}>
          <div style={{fontSize:'0.62rem', color:'#f59e0b', letterSpacing:'0.14em', textTransform:'uppercase', fontWeight:700, marginBottom:12}}>
            ⭐ MVP · {labelComp(match)}{match.match_number ? ` · ${labelJornada(match)}` : ''}
          </div>

          {mvpPlayer.player?.photo_url
            ? <img src={mvpPlayer.player.photo_url} alt={mvpPlayer.player.name} className="mvp-avatar" />
            : <div className="mvp-avatar-placeholder">{mvpPlayer.player?.name?.charAt(0).toUpperCase()}</div>
          }

          <div className="display-font" style={{fontSize:'2rem', color:'white', lineHeight:1, marginBottom:4}}>
            {mvpPlayer.player?.name}
          </div>
          <div style={{fontSize:'0.7rem', color:'#78716c', marginBottom:12}}>
            {mvpPlayer.player?.team === 'white' ? '⚪ Brancos' : '⚫ Pretos'} · {new Date(match.date).toLocaleDateString('pt-PT', {day:'numeric', month:'long', year:'numeric'})}
          </div>

          <div style={{display:'inline-flex', alignItems:'baseline', gap:6, background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:12, padding:'6px 16px'}}>
            <span style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:'2.2rem', color:'#f59e0b', lineHeight:1}}>{mvpPlayer.count}</span>
            <span style={{fontSize:'0.72rem', color:'#78716c'}}>de {totalVotos} votos</span>
          </div>
        </div>

        {/* Outros candidatos com votos */}
        {outrosCandidatos.length > 0 && (
          <div className="section-card" style={{marginBottom:16}}>
            <div className="section-title">Outros votos</div>
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              {outrosCandidatos.map(c => {
                const pct = Math.round((c.count / totalVotos) * 100)
                return (
                  <div key={c.player?.id}>
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                      {c.player?.photo_url
                        ? <img src={c.player.photo_url} alt={c.player.name} className="mini-avatar" style={{border:'1px solid rgba(255,255,255,0.1)'}} />
                        : <div className={`mini-avatar-placeholder ${c.player?.team === 'white' ? 'mini-w' : 'mini-b'}`}>
                            {c.player?.name?.charAt(0).toUpperCase()}
                          </div>
                      }
                      <div style={{flex:1}}>
                        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                          <span style={{fontSize:'0.85rem', fontWeight:600, color:'#94a3b8'}}>{c.player?.name}</span>
                          <span style={{fontSize:'0.75rem', fontWeight:700, color:'#475569'}}>{c.count} {c.count === 1 ? 'voto' : 'votos'}</span>
                        </div>
                        <div className="vote-bar-bg">
                          <div className="vote-bar-fill vote-bar-fill-other" style={{width:`${pct}%`}} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quem votou em quem */}
        <div className="section-card">
          <div className="section-title">Quem votou em quem</div>
          <div>
            {votes.map((v, i) => (
              <div key={i} className="voter-row">
                {/* Votante */}
                {v.voter?.photo_url
                  ? <img src={v.voter.photo_url} alt={v.voter.name} className="mini-avatar" style={{border: v.voter?.team === 'white' ? '1px solid rgba(226,232,240,0.2)' : '1px solid rgba(40,40,40,0.8)'}} />
                  : <div className={`mini-avatar-placeholder ${v.voter?.team === 'white' ? 'mini-w' : 'mini-b'}`}>
                      {v.voter?.name?.charAt(0).toUpperCase()}
                    </div>
                }
                <span style={{fontSize:'0.82rem', color:'#64748b', flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                  {v.voter?.name}
                </span>

                <span className="arrow-icon">→</span>

                {/* Candidato */}
                <span className={`candidate-chip ${v.voted_for_player_id === mvpPlayer.player?.id ? '' : 'candidate-chip-other'}`}>
                  {v.voted_for_player_id === mvpPlayer.player?.id && '⭐ '}
                  {v.candidate?.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
