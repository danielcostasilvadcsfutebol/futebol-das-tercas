import { supabase } from './lib/supabase'

export const revalidate = 0

export default async function Home() {
  const { data: series } = await supabase
    .from('series')
    .select('*')
    .eq('status', 'active')
    .single()

  const { data: historico } = await supabase
    .from('series')
    .select('*')
    .eq('status', 'finished')
    .order('id', { ascending: false })

  const totalCampBrancos = historico?.filter(s => s.league_winner === 'white').length || 0
  const totalCampPretos  = historico?.filter(s => s.league_winner === 'black').length || 0
  const totalTacaBrancos = historico?.filter(s => s.cup_winner === 'white').length || 0
  const totalTacaPretos  = historico?.filter(s => s.cup_winner === 'black').length || 0

  // Mostrar só competições que já começaram (pelo menos 1 vitória registada)
  const mostrarLiga = series && (series.league_white_wins > 0 || series.league_black_wins > 0 || series.league_winner)
  const mostrarTaca = series && (series.cup_white_wins > 0 || series.cup_black_wins > 0 || series.cup_winner)

  const pctBrancos = (totalCampBrancos + totalTacaBrancos) > 0
    ? Math.round((totalCampBrancos / (totalCampBrancos + totalCampPretos)) * 100)
    : 0

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        .home-page { font-family: 'DM Sans', sans-serif; }
        .display-font { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }

        .hero-score {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 4rem;
          line-height: 1;
          color: white;
        }

        .serie-card {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          padding: 18px 16px;
        }
        .serie-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(30,41,59,0.97) 0%, rgba(10,15,30,0.99) 100%);
          z-index: 0;
        }
        .serie-card > * { position: relative; z-index: 1; }

        .trophy-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
        }

        .palmares-card {
          background: linear-gradient(135deg, rgba(30,41,59,0.97), rgba(10,15,30,0.99));
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          overflow: hidden;
        }

        .team-col {
          flex: 1;
          padding: 16px 14px;
          text-align: center;
        }
        .team-col-white {
          border-right: 1px solid rgba(255,255,255,0.06);
        }

        .trophy-count {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2.8rem;
          line-height: 1;
          color: white;
        }
        .trophy-label {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #475569;
          margin-top: 2px;
        }

        .quick-link {
          background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98));
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 14px 8px;
          text-align: center;
          text-decoration: none;
          transition: border-color 0.15s, transform 0.15s;
          display: block;
        }
        .quick-link:active { transform: scale(0.96); }

        .competition-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 99px;
          margin-bottom: 12px;
        }
        .badge-league {
          background: rgba(251,191,36,0.1);
          border: 1px solid rgba(251,191,36,0.2);
          color: #f59e0b;
        }
        .badge-cup {
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.2);
          color: #818cf8;
        }

        .vs-divider {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.2rem;
          color: #334155;
          padding: 0 4px;
        }

        .score-team {
          flex: 1;
          text-align: center;
        }
        .score-team-label {
          font-size: 0.65rem;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 4px;
        }

        .progress-bar-bg {
          height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 99px;
          overflow: hidden;
          margin-top: 16px;
        }
        .progress-bar-white {
          height: 100%;
          border-radius: 99px;
          background: linear-gradient(90deg, rgba(226,232,240,0.6), rgba(226,232,240,0.3));
          transition: width 0.5s ease;
        }
      `}</style>

      <div className="home-page space-y-4 pb-10">

        {/* Hero header — compacto */}
        <div style={{paddingTop:12, paddingBottom:4}}>
          <div style={{display:'flex', alignItems:'baseline', gap:8, marginBottom:2}}>
            <span style={{fontSize:'1.5rem'}}>⚽</span>
            <h1 className="display-font" style={{fontSize:'1.9rem', color:'white', lineHeight:1}}>
              Futebol das Terças
            </h1>
          </div>
          <p style={{fontSize:'0.75rem', color:'#334155', letterSpacing:'0.06em', textTransform:'uppercase', fontWeight:600}}>
            Jogos · Resultados · Títulos
          </p>
        </div>

        {/* Série ativa */}
        {series && (mostrarLiga || mostrarTaca) && (
          <div className="serie-card" style={{
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
          }}>
            {/* Header da série */}
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14}}>
              <div>
                <div className="display-font" style={{fontSize:'1.4rem', color:'white', lineHeight:1}}>
                  Série {series.id}
                </div>
                <div style={{fontSize:'0.62rem', color:'#22c55e', letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:700, marginTop:2}}>
                  ● Em curso
                </div>
              </div>
              <div style={{
                fontFamily:"'Bebas Neue', sans-serif",
                fontSize:'0.75rem', letterSpacing:'0.15em',
                color:'#334155', textTransform:'uppercase',
              }}>
                {mostrarLiga && !mostrarTaca ? 'Campeonato' : mostrarTaca && !mostrarLiga ? 'Taça' : ''}
              </div>
            </div>

            {/* Competições em curso */}
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              {mostrarLiga && (
                <div style={{background:'rgba(251,191,36,0.04)', border:'1px solid rgba(251,191,36,0.1)', borderRadius:14, padding:'12px 14px'}}>
                  <div className="competition-badge badge-league">👑 Campeonato</div>
                  {series.league_winner ? (
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <span style={{fontSize:'1.1rem'}}>🏅</span>
                      <span style={{fontSize:'1rem', fontWeight:700, color:'white'}}>
                        {series.league_winner === 'white' ? '⚪ Brancos vencem!' : '⚫ Pretos vencem!'}
                      </span>
                    </div>
                  ) : (
                    <div style={{display:'flex', alignItems:'center'}}>
                      <div className="score-team">
                        <div className="score-team-label">⚪ Brancos</div>
                        <div className="hero-score">{series.league_white_wins}</div>
                      </div>
                      <div className="vs-divider">—</div>
                      <div className="score-team">
                        <div className="score-team-label">⚫ Pretos</div>
                        <div className="hero-score">{series.league_black_wins}</div>
                      </div>
                    </div>
                  )}
                  {!series.league_winner && (
                    <div className="progress-bar-bg">
                      <div className="progress-bar-white" style={{
                        width: `${series.league_white_wins + series.league_black_wins > 0
                          ? Math.round((series.league_white_wins / (series.league_white_wins + series.league_black_wins)) * 100)
                          : 50}%`
                      }} />
                    </div>
                  )}
                </div>
              )}

              {mostrarTaca && (
                <div style={{background:'rgba(99,102,241,0.04)', border:'1px solid rgba(99,102,241,0.1)', borderRadius:14, padding:'12px 14px'}}>
                  <div className="competition-badge badge-cup">🏆 Taça</div>
                  {series.cup_winner ? (
                    <div style={{display:'flex', alignItems:'center', gap:8}}>
                      <span style={{fontSize:'1.1rem'}}>🏅</span>
                      <span style={{fontSize:'1rem', fontWeight:700, color:'white'}}>
                        {series.cup_winner === 'white' ? '⚪ Brancos vencem!' : '⚫ Pretos vencem!'}
                      </span>
                    </div>
                  ) : (
                    <div style={{display:'flex', alignItems:'center'}}>
                      <div className="score-team">
                        <div className="score-team-label">⚪ Brancos</div>
                        <div className="hero-score">{series.cup_white_wins}</div>
                      </div>
                      <div className="vs-divider">—</div>
                      <div className="score-team">
                        <div className="score-team-label">⚫ Pretos</div>
                        <div className="hero-score">{series.cup_black_wins}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Palmarés */}
        {(historico?.length > 0) && (
          <div className="palmares-card">
            {/* Header */}
            <div style={{
              padding:'12px 16px 10px',
              borderBottom:'1px solid rgba(255,255,255,0.05)',
              display:'flex', alignItems:'center', justifyContent:'space-between'
            }}>
              <div className="display-font" style={{fontSize:'1.1rem', color:'white', letterSpacing:'0.08em'}}>
                Palmarés
              </div>
              <div style={{fontSize:'0.65rem', color:'#334155', letterSpacing:'0.1em', textTransform:'uppercase'}}>
                {historico.length} séries
              </div>
            </div>

            {/* Campeonato */}
            <div style={{padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
              <div style={{fontSize:'0.65rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10, fontWeight:600}}>
                👑 Campeonato
              </div>
              <div style={{display:'flex'}}>
                <div className="team-col team-col-white">
                  <div style={{fontSize:'0.7rem', color:'#94a3b8', marginBottom:6}}>⚪ Brancos</div>
                  <div className="trophy-count">{totalCampBrancos}</div>
                  <div className="trophy-label">títulos</div>
                </div>
                <div className="team-col">
                  <div style={{fontSize:'0.7rem', color:'#64748b', marginBottom:6}}>⚫ Pretos</div>
                  <div className="trophy-count">{totalCampPretos}</div>
                  <div className="trophy-label">títulos</div>
                </div>
              </div>
              {/* Barra comparativa */}
              {(totalCampBrancos + totalCampPretos) > 0 && (
                <div style={{padding:'0 14px 4px'}}>
                  <div style={{height:4, background:'rgba(100,116,139,0.3)', borderRadius:99, overflow:'hidden', marginTop:4}}>
                    <div style={{
                      height:'100%', borderRadius:99,
                      background:'linear-gradient(90deg, rgba(226,232,240,0.7), rgba(226,232,240,0.4))',
                      width:`${Math.round((totalCampBrancos/(totalCampBrancos+totalCampPretos))*100)}%`
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* Taça */}
            {(totalTacaBrancos + totalTacaPretos) > 0 && (
              <div style={{padding:'12px 16px'}}>
                <div style={{fontSize:'0.65rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10, fontWeight:600}}>
                  🏆 Taça
                </div>
                <div style={{display:'flex'}}>
                  <div className="team-col team-col-white">
                    <div style={{fontSize:'0.7rem', color:'#94a3b8', marginBottom:6}}>⚪ Brancos</div>
                    <div className="trophy-count">{totalTacaBrancos}</div>
                    <div className="trophy-label">títulos</div>
                  </div>
                  <div className="team-col">
                    <div style={{fontSize:'0.7rem', color:'#64748b', marginBottom:6}}>⚫ Pretos</div>
                    <div className="trophy-count">{totalTacaPretos}</div>
                    <div className="trophy-label">títulos</div>
                  </div>
                </div>
                {(totalTacaBrancos + totalTacaPretos) > 0 && (
                  <div style={{padding:'0 14px 4px'}}>
                    <div style={{height:4, background:'rgba(100,116,139,0.3)', borderRadius:99, overflow:'hidden', marginTop:4}}>
                      <div style={{
                        height:'100%', borderRadius:99,
                        background:'linear-gradient(90deg, rgba(226,232,240,0.7), rgba(226,232,240,0.4))',
                        width:`${Math.round((totalTacaBrancos/(totalTacaBrancos+totalTacaPretos))*100)}%`
                      }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Links rápidos */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8}}>
          {[
            { href:'/jogos', icon:'📅', label:'Jogos' },
            { href:'/jogadores', icon:'👥', label:'Jogadores' },
            { href:'/titulos', icon:'🏆', label:'Títulos' },
          ].map(l => (
            <a key={l.href} href={l.href} className="quick-link">
              <div style={{fontSize:'1.6rem', marginBottom:5}}>{l.icon}</div>
              <div className="display-font" style={{fontSize:'0.9rem', color:'#94a3b8', letterSpacing:'0.06em'}}>{l.label}</div>
            </a>
          ))}
        </div>

      </div>
    </>
  )
}
