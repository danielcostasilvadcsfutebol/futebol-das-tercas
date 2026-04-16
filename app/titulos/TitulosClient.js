'use client'
import { useState } from 'react'

export default function TitulosClient({ series, totalCampBrancos, totalCampPretos, totalTacaBrancos, totalTacaPretos }) {
  const [aberto, setAberto] = useState(null)

  const toggle = (id) => setAberto(aberto === id ? null : id)

  const nomeVencedor = (winner) => winner === 'white' ? '⚪ Brancos' : '⚫ Pretos'
  const corVencedor = (winner) => winner === 'white' ? 'rgba(226,232,240,0.9)' : 'rgba(100,116,139,0.9)'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        .titulos-page { font-family: 'DM Sans', sans-serif; }
        .display-font { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }

        .palmares-card {
          background: linear-gradient(135deg, rgba(30,41,59,0.97), rgba(10,15,30,0.99));
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          overflow: hidden;
        }
        .team-col { flex: 1; padding: 14px 12px; text-align: center; }
        .team-col-white { border-right: 1px solid rgba(255,255,255,0.05); }
        .trophy-count { font-family: 'Bebas Neue', sans-serif; font-size: 3rem; line-height: 1; color: white; }
        .trophy-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; margin-top: 2px; }

        .comp-bar-bg { height: 3px; background: rgba(100,116,139,0.2); border-radius: 99px; overflow: hidden; margin: 8px 14px 4px; }
        .comp-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, rgba(226,232,240,0.7), rgba(226,232,240,0.3)); }

        .serie-row {
          background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98));
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          overflow: hidden;
          transition: border-color 0.15s;
        }
        .serie-row.active-serie { border-color: rgba(34,197,94,0.2); }
        .serie-row-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          cursor: pointer;
          user-select: none;
          transition: background 0.15s;
        }
        .serie-row-header:active { background: rgba(255,255,255,0.02); }

        .serie-body {
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 12px 14px;
        }

        .comp-block {
          border-radius: 12px;
          padding: 10px 12px;
        }
        .comp-block-league { background: rgba(251,191,36,0.04); border: 1px solid rgba(251,191,36,0.1); }
        .comp-block-cup    { background: rgba(99,102,241,0.04); border: 1px solid rgba(99,102,241,0.1); }

        .badge-active { background: rgba(34,197,94,0.12); color: #22c55e; border: 1px solid rgba(34,197,94,0.2); border-radius: 99px; font-size: 0.6rem; font-weight: 700; padding: 2px 8px; letter-spacing: 0.06em; }
        .badge-done   { background: rgba(255,255,255,0.05); color: #475569; border: 1px solid rgba(255,255,255,0.07); border-radius: 99px; font-size: 0.6rem; font-weight: 600; padding: 2px 8px; }

        .section-title { font-family: 'Bebas Neue', sans-serif; font-size: 1rem; letter-spacing: 0.1em; color: #64748b; text-transform: uppercase; margin-bottom: 10px; padding-left: 2px; }

        .chevron { font-size: 0.7rem; color: #334155; transition: transform 0.2s; }
        .chevron.open { transform: rotate(180deg); }
      `}</style>

      <div className="titulos-page space-y-5 pb-12">

        {/* Header */}
        <div style={{paddingTop:10, paddingBottom:2}}>
          <h1 className="display-font" style={{fontSize:'2.2rem', color:'white', lineHeight:1, marginBottom:2}}>Títulos</h1>
          <p style={{fontSize:'0.68rem', color:'#334155', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600}}>
            Palmarés · Histórico de séries
          </p>
        </div>

        {/* Palmarés geral */}
        <div className="palmares-card">
          <div style={{padding:'12px 16px 10px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div className="display-font" style={{fontSize:'1.05rem', color:'white', letterSpacing:'0.08em'}}>Palmarés</div>
            <div style={{fontSize:'0.62rem', color:'#334155', letterSpacing:'0.1em', textTransform:'uppercase'}}>{series.length} séries</div>
          </div>

          {/* Campeonato */}
          <div style={{padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
            <div style={{fontSize:'0.62rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8, fontWeight:600}}>
              👑 Campeonato
            </div>
            <div style={{display:'flex'}}>
              <div className="team-col team-col-white">
                <div style={{fontSize:'0.68rem', color:'#94a3b8', marginBottom:4}}>⚪ Brancos</div>
                <div className="trophy-count">{totalCampBrancos}</div>
                <div className="trophy-label">títulos</div>
              </div>
              <div className="team-col">
                <div style={{fontSize:'0.68rem', color:'#64748b', marginBottom:4}}>⚫ Pretos</div>
                <div className="trophy-count">{totalCampPretos}</div>
                <div className="trophy-label">títulos</div>
              </div>
            </div>
            {(totalCampBrancos + totalCampPretos) > 0 && (
              <div className="comp-bar-bg">
                <div className="comp-bar-fill" style={{width:`${Math.round((totalCampBrancos/(totalCampBrancos+totalCampPretos))*100)}%`}} />
              </div>
            )}
          </div>

          {/* Taça */}
          {(totalTacaBrancos + totalTacaPretos) > 0 && (
            <div style={{padding:'10px 16px'}}>
              <div style={{fontSize:'0.62rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8, fontWeight:600}}>
                🏆 Taça
              </div>
              <div style={{display:'flex'}}>
                <div className="team-col team-col-white">
                  <div style={{fontSize:'0.68rem', color:'#94a3b8', marginBottom:4}}>⚪ Brancos</div>
                  <div className="trophy-count">{totalTacaBrancos}</div>
                  <div className="trophy-label">títulos</div>
                </div>
                <div className="team-col">
                  <div style={{fontSize:'0.68rem', color:'#64748b', marginBottom:4}}>⚫ Pretos</div>
                  <div className="trophy-count">{totalTacaPretos}</div>
                  <div className="trophy-label">títulos</div>
                </div>
              </div>
              <div className="comp-bar-bg">
                <div className="comp-bar-fill" style={{width:`${Math.round((totalTacaBrancos/(totalTacaBrancos+totalTacaPretos))*100)}%`}} />
              </div>
            </div>
          )}
        </div>

        {/* Lista de séries */}
        <div>
          <div className="section-title">Séries</div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {series.map(s => {
              const isActive = s.status === 'active'
              const isOpen = aberto === s.id
              const tacaDisp = s.cup_white_wins > 0 || s.cup_black_wins > 0 || s.cup_winner

              return (
                <div key={s.id} className={`serie-row ${isActive ? 'active-serie' : ''}`}>
                  {/* Header clicável */}
                  <div className="serie-row-header" onClick={() => toggle(s.id)}>
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                      <div className="display-font" style={{fontSize:'1.2rem', color:'white'}}>
                        Série {s.id}
                      </div>
                      {isActive
                        ? <span className="badge-active">● Em curso</span>
                        : <span className="badge-done">Terminada</span>
                      }
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                      {/* Resumo inline quando fechado */}
                      {!isOpen && (
                        <div style={{display:'flex', gap:8}}>
                          {s.league_winner && (
                            <span style={{fontSize:'0.65rem', color: corVencedor(s.league_winner), fontWeight:600}}>
                              👑 {nomeVencedor(s.league_winner)}
                            </span>
                          )}
                          {s.cup_winner && (
                            <span style={{fontSize:'0.65rem', color: corVencedor(s.cup_winner), fontWeight:600}}>
                              🏆 {nomeVencedor(s.cup_winner)}
                            </span>
                          )}
                          {!s.league_winner && isActive && (
                            <span style={{fontSize:'0.65rem', color:'#334155'}}>
                              {s.league_white_wins}–{s.league_black_wins}
                            </span>
                          )}
                        </div>
                      )}
                      <span className={`chevron ${isOpen ? 'open' : ''}`}>▼</span>
                    </div>
                  </div>

                  {/* Corpo expandido */}
                  {isOpen && (
                    <div className="serie-body">
                      <div style={{display:'flex', flexDirection:'column', gap:8}}>

                        {/* Campeonato */}
                        <div className="comp-block comp-block-league">
                          <div style={{fontSize:'0.62rem', color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:700, marginBottom:8}}>
                            👑 Campeonato
                          </div>
                          {s.league_winner ? (
                            <div style={{display:'flex', alignItems:'center', gap:8}}>
                              <span style={{fontSize:'1.3rem'}}>🏅</span>
                              <span style={{fontSize:'1rem', fontWeight:700, color: corVencedor(s.league_winner)}}>
                                {nomeVencedor(s.league_winner)}
                              </span>
                            </div>
                          ) : (
                            <>
                              <div style={{display:'flex', alignItems:'center', justifyContent:'space-around'}}>
                                <div style={{textAlign:'center'}}>
                                  <div style={{fontSize:'0.62rem', color:'#475569', marginBottom:2}}>⚪ Brancos</div>
                                  <div className="display-font" style={{fontSize:'2.5rem', color:'white', lineHeight:1}}>{s.league_white_wins}</div>
                                </div>
                                <div className="display-font" style={{fontSize:'1.2rem', color:'#1e293b'}}>—</div>
                                <div style={{textAlign:'center'}}>
                                  <div style={{fontSize:'0.62rem', color:'#475569', marginBottom:2}}>⚫ Pretos</div>
                                  <div className="display-font" style={{fontSize:'2.5rem', color:'white', lineHeight:1}}>{s.league_black_wins}</div>
                                </div>
                              </div>
                              <div style={{height:4, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden', marginTop:8}}>
                                <div style={{height:'100%', background:'linear-gradient(90deg,rgba(226,232,240,0.6),rgba(226,232,240,0.3))', borderRadius:99,
                                  width:`${(s.league_white_wins + s.league_black_wins) > 0 ? Math.round((s.league_white_wins/(s.league_white_wins+s.league_black_wins))*100) : 50}%`}} />
                              </div>
                            </>
                          )}
                        </div>

                        {/* Taça */}
                        {tacaDisp ? (
                          <div className="comp-block comp-block-cup">
                            <div style={{fontSize:'0.62rem', color:'#818cf8', textTransform:'uppercase', letterSpacing:'0.1em', fontWeight:700, marginBottom:8}}>
                              🏆 Taça
                            </div>
                            {s.cup_winner ? (
                              <div style={{display:'flex', alignItems:'center', gap:8}}>
                                <span style={{fontSize:'1.3rem'}}>🏅</span>
                                <span style={{fontSize:'1rem', fontWeight:700, color: corVencedor(s.cup_winner)}}>
                                  {nomeVencedor(s.cup_winner)}
                                </span>
                              </div>
                            ) : (
                              <>
                                <div style={{display:'flex', alignItems:'center', justifyContent:'space-around'}}>
                                  <div style={{textAlign:'center'}}>
                                    <div style={{fontSize:'0.62rem', color:'#475569', marginBottom:2}}>⚪ Brancos</div>
                                    <div className="display-font" style={{fontSize:'2.5rem', color:'white', lineHeight:1}}>{s.cup_white_wins}</div>
                                  </div>
                                  <div className="display-font" style={{fontSize:'1.2rem', color:'#1e293b'}}>—</div>
                                  <div style={{textAlign:'center'}}>
                                    <div style={{fontSize:'0.62rem', color:'#475569', marginBottom:2}}>⚫ Pretos</div>
                                    <div className="display-font" style={{fontSize:'2.5rem', color:'white', lineHeight:1}}>{s.cup_black_wins}</div>
                                  </div>
                                </div>
                                <div style={{height:4, background:'rgba(255,255,255,0.05)', borderRadius:99, overflow:'hidden', marginTop:8}}>
                                  <div style={{height:'100%', background:'linear-gradient(90deg,rgba(99,102,241,0.5),rgba(99,102,241,0.2))', borderRadius:99,
                                    width:`${(s.cup_white_wins + s.cup_black_wins) > 0 ? Math.round((s.cup_white_wins/(s.cup_white_wins+s.cup_black_wins))*100) : 50}%`}} />
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div style={{fontSize:'0.72rem', color:'#334155', fontStyle:'italic'}}>🏆 Taça — não disputada</div>
                        )}

                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </>
  )
}
