import { supabase } from '../lib/supabase'

export const revalidate = 0

export default async function Jogos() {
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      *,
      series (id, status),
      match_players (
        played_for,
        players (name, team)
      )
    `)
    .order('date', { ascending: false })

  const { data: matchVotacao } = await supabase
    .from('matches')
    .select('id, voting_open, voting_closes_at, phase, match_number, series_id')
    .eq('voting_open', true)
    .maybeSingle()

  const horasVotacao = matchVotacao?.voting_closes_at
    ? Math.max(0, Math.round((new Date(matchVotacao.voting_closes_at) - new Date()) / 3600000))
    : null

  const labelJornada = (match) => {
    if (!match.match_number) return null
    return match.phase === 'cup' ? `Jogo ${match.match_number}` : `Jornada ${match.match_number}`
  }

  const agendados = matches?.filter(m => m.white_wins === null && m.black_wins === null)
    .sort((a, b) => new Date(a.date) - new Date(b.date)) ?? []
  const realizados = matches?.filter(m => m.white_wins !== null && m.black_wins !== null)
    .sort((a, b) => new Date(b.date) - new Date(a.date)) ?? []

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
        .match-card-pending::before {
          background: linear-gradient(90deg, transparent, rgba(251,191,36,0.4), transparent);
        }
        .match-card-done::before {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
        }

        .match-score {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 2rem;
          line-height: 1;
          color: white;
        }
        .match-score-sep {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.2rem;
          color: #1e293b;
          padding: 0 4px;
        }

        .team-name-row {
          display: flex;
          gap: 4px;
          align-items: center;
          font-size: 0.6rem;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 2px;
        }

        .badge-comp {
          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 99px;
        }
        .badge-league { background: rgba(251,191,36,0.1); color: #f59e0b; border: 1px solid rgba(251,191,36,0.15); }
        .badge-cup    { background: rgba(99,102,241,0.1); color: #818cf8; border: 1px solid rgba(99,102,241,0.15); }

        .pending-pill {
          font-size: 0.62rem;
          font-weight: 700;
          color: #f59e0b;
          background: rgba(251,191,36,0.08);
          border: 1px solid rgba(251,191,36,0.15);
          border-radius: 8px;
          padding: 4px 10px;
          letter-spacing: 0.04em;
        }

        .players-row {
          border-top: 1px solid rgba(255,255,255,0.05);
          margin-top: 10px;
          padding-top: 10px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .players-label {
          font-size: 0.58rem;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 3px;
          font-weight: 600;
        }
        .players-names {
          font-size: 0.72rem;
          color: #64748b;
          line-height: 1.5;
        }

        .winner-white { color: rgba(226,232,240,0.9); }
        .winner-black { color: rgba(100,116,139,0.9); }
      `}</style>

      <div className="jogos-page space-y-5 pb-10">

        {/* Header */}
        <div style={{paddingTop:10, paddingBottom:2}}>
          <h1 className="display-font" style={{fontSize:'2.2rem', color:'white', lineHeight:1, marginBottom:2}}>Jogos</h1>
          <p style={{fontSize:'0.68rem', color:'#334155', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600}}>
            Resultados · Agendamentos
          </p>
        </div>

        {/* Banner votação */}
        {matchVotacao && (
          <a href="/votar" style={{
            display:'block',
            background:'linear-gradient(135deg, rgba(28,25,23,0.98), rgba(15,10,5,0.99))',
            border:'1px solid rgba(251,191,36,0.3)',
            borderRadius:16,
            padding:'12px 14px',
            textDecoration:'none',
            position:'relative',
            overflow:'hidden',
          }}>
            <div style={{position:'absolute', right:-10, top:-10, fontSize:'4rem', opacity:0.06, transform:'rotate(15deg)'}}>⭐</div>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:'0.6rem', color:'#f59e0b', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:700, marginBottom:2}}>⭐ MVP aberta</div>
                <div style={{fontSize:'0.85rem', fontWeight:700, color:'white'}}>Votar no melhor em campo</div>
                {horasVotacao !== null && <div style={{fontSize:'0.68rem', color:'#78716c', marginTop:1}}>Fecha em {horasVotacao}h</div>}
              </div>
              <div style={{background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:10, padding:'7px 12px', fontSize:'0.72rem', fontWeight:700, color:'#f59e0b', flexShrink:0}}>
                Votar →
              </div>
            </div>
          </a>
        )}

        {(!matches || matches.length === 0) && (
          <div style={{textAlign:'center', color:'#334155', fontSize:'0.85rem', padding:'40px 0'}}>
            Ainda não há jogos registados.
          </div>
        )}

        {/* Agendados */}
        {agendados.length > 0 && (
          <div>
            <div className="section-title" style={{color:'#f59e0b'}}>
              <span>Agendados</span>
              <span style={{fontSize:'0.7rem', color:'#78350f', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.12)', borderRadius:99, padding:'1px 7px', fontFamily:'DM Sans'}}>
                {agendados.length}
              </span>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {agendados.map(match => {
                const brancos = match.match_players?.filter(mp => mp.played_for === 'white').map(mp => mp.players?.name).filter(Boolean)
                const pretos  = match.match_players?.filter(mp => mp.played_for === 'black').map(mp => mp.players?.name).filter(Boolean)
                return (
                  <div key={match.id} className="match-card match-card-pending" style={{
                    border: '1px solid rgba(251,191,36,0.12)',
                    padding: '12px 14px',
                  }}>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                      <div>
                        <div style={{fontSize:'0.82rem', fontWeight:600, color:'#cbd5e1', marginBottom:3}}>
                          {new Date(match.date).toLocaleDateString('pt-PT', { weekday:'short', day:'numeric', month:'short' })}
                        </div>
                        <div style={{display:'flex', alignItems:'center', gap:5, flexWrap:'wrap'}}>
                          <span className={`badge-comp ${match.phase === 'cup' ? 'badge-cup' : 'badge-league'}`}>
                            {match.phase === 'cup' ? '🏆 Taça' : '👑 Camp.'}
                          </span>
                          <span style={{fontSize:'0.62rem', color:'#334155'}}>Série {match.series?.id}</span>
                          {match.match_number && (
                            <span style={{fontSize:'0.62rem', color:'#334155'}}>{labelJornada(match)}</span>
                          )}
                        </div>
                      </div>
                      <div className="pending-pill">Por realizar</div>
                    </div>
                    {(brancos?.length > 0 || pretos?.length > 0) && (
                      <div className="players-row">
                        <div>
                          <div className="players-label">⚪ Brancos</div>
                          <div className="players-names">{brancos?.join(', ') || '—'}</div>
                        </div>
                        <div>
                          <div className="players-label">⚫ Pretos</div>
                          <div className="players-names">{pretos?.join(', ') || '—'}</div>
                        </div>
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
            <div className="section-title" style={{color:'#64748b'}}>
              <span>Realizados</span>
              <span style={{fontSize:'0.7rem', color:'#1e293b', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:99, padding:'1px 7px', fontFamily:'DM Sans'}}>
                {realizados.length}
              </span>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {realizados.map(match => {
                const brancos = match.match_players?.filter(mp => mp.played_for === 'white').map(mp => mp.players?.name).filter(Boolean)
                const pretos  = match.match_players?.filter(mp => mp.played_for === 'black').map(mp => mp.players?.name).filter(Boolean)
                const brancosGanham = match.white_wins > match.black_wins
                const pretosGanham  = match.black_wins > match.white_wins
                return (
                  <div key={match.id} className="match-card match-card-done" style={{
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '12px 14px',
                  }}>
                    {/* Topo: data + badges */}
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
                      <div style={{display:'flex', alignItems:'center', gap:5, flexWrap:'wrap'}}>
                        <span className={`badge-comp ${match.phase === 'cup' ? 'badge-cup' : 'badge-league'}`}>
                          {match.phase === 'cup' ? '🏆 Taça' : '👑 Camp.'}
                        </span>
                        <span style={{fontSize:'0.62rem', color:'#334155'}}>Série {match.series?.id}</span>
                        {match.match_number && (
                          <span style={{fontSize:'0.62rem', color:'#334155'}}>{labelJornada(match)}</span>
                        )}
                      </div>
                      <span style={{fontSize:'0.7rem', color:'#334155'}}>
                        {new Date(match.date).toLocaleDateString('pt-PT', { day:'numeric', month:'short', year:'numeric' })}
                      </span>
                    </div>

                    {/* Placar central */}
                    <div style={{display:'flex', alignItems:'center'}}>
                      <div style={{flex:1, textAlign:'center'}}>
                        <div className="team-name-row" style={{justifyContent:'center'}}>
                          ⚪ <span>Brancos</span>
                        </div>
                        <div className="match-score" style={{
                          color: brancosGanham ? 'white' : '#334155'
                        }}>{match.white_wins}</div>
                      </div>
                      <div className="match-score-sep">—</div>
                      <div style={{flex:1, textAlign:'center'}}>
                        <div className="team-name-row" style={{justifyContent:'center'}}>
                          ⚫ <span>Pretos</span>
                        </div>
                        <div className="match-score" style={{
                          color: pretosGanham ? 'white' : '#334155'
                        }}>{match.black_wins}</div>
                      </div>
                    </div>

                    {/* Jogadores */}
                    {(brancos?.length > 0 || pretos?.length > 0) && (
                      <div className="players-row">
                        <div>
                          <div className="players-label">⚪ Brancos</div>
                          <div className="players-names">{brancos?.join(', ')}</div>
                        </div>
                        <div>
                          <div className="players-label">⚫ Pretos</div>
                          <div className="players-names">{pretos?.join(', ')}</div>
                        </div>
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
