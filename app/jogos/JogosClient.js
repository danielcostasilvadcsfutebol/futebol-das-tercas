'use client'
import { useState } from 'react'

export default function JogosClient({ agendados, realizados, matchVotacao, horasVotacao, mvpPorJogo = {} }) {
  const [aberto, setAberto] = useState(null)

  const toggle = (id) => setAberto(aberto === id ? null : id)

  const labelJornada = (match) => {
    if (!match.match_number) return null
    return match.phase === 'cup' ? `Jogo ${match.match_number}` : `Jornada ${match.match_number}`
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        .jogos-page { font-family: 'DM Sans', sans-serif; }
        .display-font { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }

        .section-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 0.95rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 10px;
          padding-left: 2px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .match-card {
          background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98));
          border-radius: 16px;
          overflow: hidden;
          position: relative;
        }
        .match-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
        }
        .match-card-pending::before { background: linear-gradient(90deg, transparent, rgba(251,191,36,0.4), transparent); }
        .match-card-done::before    { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent); }

        .match-score { font-family: 'Bebas Neue', sans-serif; font-size: 2.2rem; line-height: 1; }
        .match-score-sep { font-family: 'Bebas Neue', sans-serif; font-size: 1.2rem; color: #334155; padding: 0 6px; }

        .team-name-row {
          display: flex; gap: 4px; align-items: center;
          font-size: 0.68rem; color: #94a3b8;
          text-transform: uppercase; letter-spacing: 0.08em;
          margin-bottom: 2px; justify-content: center;
          font-weight: 600;
        }

        .badge-comp { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 6px; border-radius: 99px; }
        .badge-league { background: rgba(251,191,36,0.1); color: #f59e0b; border: 1px solid rgba(251,191,36,0.15); }
        .badge-cup    { background: rgba(99,102,241,0.1); color: #818cf8; border: 1px solid rgba(99,102,241,0.15); }

        .pending-pill { font-size: 0.62rem; font-weight: 700; color: #f59e0b; background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.15); border-radius: 8px; padding: 4px 10px; }

        .players-row { border-top: 1px solid rgba(255,255,255,0.05); margin-top: 10px; padding-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .players-label { font-size: 0.62rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; font-weight: 600; }
        .players-names { font-size: 0.75rem; color: #e2e8f0; line-height: 1.5; }

        .chevron { font-size: 0.65rem; color: #64748b; transition: transform 0.2s; display: inline-block; }
        .chevron.open { transform: rotate(180deg); }

        .realizado-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 11px 14px;
          cursor: pointer;
          user-select: none;
        }
        .realizado-body {
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 12px 14px;
        }

        .match-meta { font-size: 0.65rem; color: #94a3b8; margin-top: 2px; }
        .match-serie { font-size: 0.62rem; color: #94a3b8; }

        .mvp-inline {
          display: flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, rgba(28,25,23,0.95), rgba(15,10,5,0.98));
          border: 1px solid rgba(251,191,36,0.2);
          border-radius: 12px;
          padding: 10px 12px;
          margin-top: 12px;
          text-decoration: none;
        }
        .mvp-inline:active { opacity: 0.85; }
        .mvp-mini-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid rgba(251,191,36,0.4);
          flex-shrink: 0;
        }
        .mvp-mini-placeholder {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(251,191,36,0.08);
          border: 2px solid rgba(251,191,36,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1rem;
          color: #f59e0b;
          flex-shrink: 0;
        }
      `}</style>

      <div className="jogos-page space-y-5 pb-10">

        {/* Header */}
        <div style={{paddingTop:10, paddingBottom:2}}>
          <h1 className="display-font" style={{fontSize:'2.2rem', color:'white', lineHeight:1, marginBottom:2}}>Jogos</h1>
          <p style={{fontSize:'0.68rem', color:'#94a3b8', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600}}>
            Histórico de jogos
          </p>
        </div>

        {/* Banner votação */}
        {matchVotacao && (
          <a href="/votar" style={{display:'block', background:'linear-gradient(135deg, rgba(28,25,23,0.98), rgba(15,10,5,0.99))', border:'1px solid rgba(251,191,36,0.3)', borderRadius:16, padding:'12px 14px', textDecoration:'none', position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', right:-10, top:-10, fontSize:'4rem', opacity:0.06, transform:'rotate(15deg)'}}>⭐</div>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:'0.6rem', color:'#f59e0b', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:700, marginBottom:2}}>⭐ MVP aberta</div>
                <div style={{fontSize:'0.85rem', fontWeight:700, color:'white'}}>
                  Votar no melhor em campo{matchVotacao.match_number ? ` · ${matchVotacao.phase === 'cup' ? `Jogo ${matchVotacao.match_number}` : `Jornada ${matchVotacao.match_number}`}` : ''}
                </div>
                {horasVotacao !== null && <div style={{fontSize:'0.68rem', color:'#94a3b8', marginTop:1}}>Fecha em {horasVotacao}h</div>}
              </div>
              <div style={{background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:10, padding:'7px 12px', fontSize:'0.72rem', fontWeight:700, color:'#f59e0b', flexShrink:0}}>
                Votar →
              </div>
            </div>
          </a>
        )}

        {agendados.length === 0 && realizados.length === 0 && (
          <div style={{textAlign:'center', color:'#94a3b8', fontSize:'0.85rem', padding:'40px 0'}}>
            Ainda não há jogos registados.
          </div>
        )}

        {/* Agendados */}
        {agendados.length > 0 && (
          <div>
            <div className="section-title" style={{color:'#f59e0b'}}>
              <span>Agendados</span>
              <span style={{fontSize:'0.7rem', color:'#f59e0b', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.12)', borderRadius:99, padding:'1px 7px', fontFamily:'DM Sans'}}>
                {agendados.length}
              </span>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {agendados.map(match => {
                const brancos = match.match_players?.filter(mp => mp.played_for === 'white').map(mp => mp.players?.name).filter(Boolean)
                const pretos  = match.match_players?.filter(mp => mp.played_for === 'black').map(mp => mp.players?.name).filter(Boolean)
                return (
                  <div key={match.id} className="match-card match-card-pending" style={{border:'1px solid rgba(251,191,36,0.12)', padding:'12px 14px'}}>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                      <div>
                        <div style={{fontSize:'0.85rem', fontWeight:600, color:'#e2e8f0', marginBottom:3}}>
                          {new Date(match.date).toLocaleDateString('pt-PT', { weekday:'short', day:'numeric', month:'short' })}
                        </div>
                        <div style={{display:'flex', alignItems:'center', gap:5, flexWrap:'wrap'}}>
                          <span className={`badge-comp ${match.phase === 'cup' ? 'badge-cup' : 'badge-league'}`}>
                            {match.phase === 'cup' ? '🏆 Taça' : '👑 Camp.'}
                          </span>
                          <span className="match-serie">Série {match.series?.id}</span>
                          {match.match_number && <span className="match-serie">{labelJornada(match)}</span>}
                        </div>
                      </div>
                      <div className="pending-pill">Por realizar</div>
                    </div>
                    {(brancos?.length > 0 || pretos?.length > 0) && (
                      <div className="players-row">
                        <div><div className="players-label">⚪ Brancos</div><div className="players-names">{brancos?.join(', ') || '—'}</div></div>
                        <div><div className="players-label">⚫ Pretos</div><div className="players-names">{pretos?.join(', ') || '—'}</div></div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Realizados */}
        {realizados.length > 0 && (
          <div>
            <div className="section-title" style={{color:'#f59e0b'}}>
              <span>Realizados</span>
              <span style={{fontSize:'0.7rem', color:'#f59e0b', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.12)', borderRadius:99, padding:'1px 7px', fontFamily:'DM Sans'}}>
                {realizados.length}
              </span>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {realizados.map(match => {
                const brancos = match.match_players?.filter(mp => mp.played_for === 'white').map(mp => mp.players?.name).filter(Boolean)
                const pretos  = match.match_players?.filter(mp => mp.played_for === 'black').map(mp => mp.players?.name).filter(Boolean)
                const brancosGanham = match.white_wins > match.black_wins
                const pretosGanham  = match.black_wins > match.white_wins
                const isOpen = aberto === match.id

                return (
                  <div key={match.id} className="match-card match-card-done" style={{border:'1px solid rgba(255,255,255,0.06)'}}>

                    {/* Header clicável */}
                    <div className="realizado-header" onClick={() => toggle(match.id)}>
                      <div style={{display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0}}>
                        {/* Placar compacto */}
                        <div style={{display:'flex', alignItems:'center', flexShrink:0}}>
                          <span className="match-score" style={{fontSize:'1.5rem', color: brancosGanham ? 'white' : '#475569'}}>{match.white_wins}</span>
                          <span className="match-score-sep" style={{fontSize:'1rem'}}>—</span>
                          <span className="match-score" style={{fontSize:'1.5rem', color: pretosGanham ? 'white' : '#475569'}}>{match.black_wins}</span>
                        </div>
                        <div style={{minWidth:0}}>
                          <div style={{display:'flex', alignItems:'center', gap:4, flexWrap:'wrap'}}>
                            <span className={`badge-comp ${match.phase === 'cup' ? 'badge-cup' : 'badge-league'}`}>
                              {match.phase === 'cup' ? '🏆 Taça' : '👑 Camp.'}
                            </span>
                            <span className="match-serie">Série {match.series?.id}</span>
                            {match.match_number && <span className="match-serie">{labelJornada(match)}</span>}
                          </div>
                          <div className="match-meta">
                            {new Date(match.date).toLocaleDateString('pt-PT', { day:'numeric', month:'short', year:'numeric' })}
                          </div>
                        </div>
                      </div>
                      <span className={`chevron ${isOpen ? 'open' : ''}`}>▼</span>
                    </div>

                    {/* Corpo expandido */}
                    {isOpen && (
                      <div className="realizado-body">
                        <div style={{display:'flex', alignItems:'center', marginBottom:0}}>
                          <div style={{flex:1, textAlign:'center'}}>
                            <div className="team-name-row">⚪ <span>Brancos</span></div>
                            <div className="match-score" style={{fontSize:'3rem', color: brancosGanham ? 'white' : '#475569'}}>{match.white_wins}</div>
                          </div>
                          <div className="match-score-sep" style={{fontSize:'1.5rem'}}>—</div>
                          <div style={{flex:1, textAlign:'center'}}>
                            <div className="team-name-row">⚫ <span>Pretos</span></div>
                            <div className="match-score" style={{fontSize:'3rem', color: pretosGanham ? 'white' : '#475569'}}>{match.black_wins}</div>
                          </div>
                        </div>

                        {(brancos?.length > 0 || pretos?.length > 0) && (
                          <div className="players-row">
                            <div><div className="players-label">⚪ Brancos</div><div className="players-names">{brancos?.join(', ')}</div></div>
                            <div><div className="players-label">⚫ Pretos</div><div className="players-names">{pretos?.join(', ')}</div></div>
                          </div>
                        )}

                        {/* MVP do jogo */}
                        {mvpPorJogo[match.id] && (() => {
                          const mvp = mvpPorJogo[match.id]
                          return (
                            <a href={`/mvp/${match.id}`} className="mvp-inline">
                              {mvp.player?.photo_url
                                ? <img src={mvp.player.photo_url} alt={mvp.player.name} className="mvp-mini-avatar" />
                                : <div className="mvp-mini-placeholder">{mvp.player?.name?.charAt(0).toUpperCase()}</div>
                              }
                              <div style={{flex:1, minWidth:0}}>
                                <div style={{fontSize:'0.6rem', color:'#f59e0b', letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:700, marginBottom:1}}>
                                  ⭐ MVP
                                </div>
                                <div style={{fontSize:'0.9rem', fontWeight:700, color:'white', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                  {mvp.player?.name}
                                </div>
                              </div>
                              <div style={{textAlign:'right', flexShrink:0}}>
                                <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.6rem', color:'#f59e0b', lineHeight:1}}>{mvp.count}</div>
                                <div style={{fontSize:'0.55rem', color:'#78716c', textTransform:'uppercase', letterSpacing:'0.06em'}}>votos</div>
                              </div>
                            </a>
                          )
                        })()}
                      </div>
                    )}
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
