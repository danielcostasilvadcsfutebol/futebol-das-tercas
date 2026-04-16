import { supabase } from './lib/supabase'

export const revalidate = 0

export default async function Home() {
  const { data: series } = await supabase
    .from('series')
    .select('*')
    .eq('status', 'active')
    .maybeSingle()

  const { data: historico } = await supabase
    .from('series')
    .select('*')
    .eq('status', 'finished')
    .order('id', { ascending: false })

  const totalCampBrancos = historico?.filter(s => s.league_winner === 'white').length || 0
  const totalCampPretos  = historico?.filter(s => s.league_winner === 'black').length || 0
  const totalTacaBrancos = historico?.filter(s => s.cup_winner === 'white').length || 0
  const totalTacaPretos  = historico?.filter(s => s.cup_winner === 'black').length || 0

  const { data: matchVotacao } = await supabase
    .from('matches')
    .select('id, voting_open, voting_closes_at, date, phase, match_number, series_id')
    .eq('voting_open', true)
    .maybeSingle()

  const horasVotacao = matchVotacao?.voting_closes_at
    ? Math.max(0, Math.round((new Date(matchVotacao.voting_closes_at) - new Date()) / 3600000))
    : null

  // Último MVP — jogo mais recente com votos e votação fechada
  let ultimoMvp = null
  if (!matchVotacao) {
    const { data: votosRecentes } = await supabase
      .from('mvp_votes')
      .select('voted_for_player_id, match_id')
      .order('voted_at', { ascending: false })

    if (votosRecentes?.length > 0) {
      // Contar votos por jogador no jogo mais recente
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
        const { data: mvpMatch } = await supabase
          .from('matches')
          .select('date, phase, match_number, series_id')
          .eq('id', matchIdMaisRecente)
          .single()
        ultimoMvp = { player: mvpPlayer, votos: contagem[mvpId], match: mvpMatch }
      }
    }
  }

  const activeComp = series?.active_competition || 'league'
  const mostrarLiga = series && (activeComp === 'league' || activeComp === 'both')
  const mostrarTaca = series && (activeComp === 'cup' || activeComp === 'both')

  // Campeonato: melhor de 21 → precisa de 11 vitórias
  const META_LIGA = 11
  const ligaTotal = series ? series.league_white_wins + series.league_black_wins : 0
  const ligaPctBrancos = ligaTotal > 0 ? Math.round((series.league_white_wins / ligaTotal) * 100) : 50

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        .home-page { font-family: 'DM Sans', sans-serif; }
        .display-font { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }

        .hero-score {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 4.5rem;
          line-height: 1;
          color: white;
        }

        .serie-card {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          padding: 16px;
          background: linear-gradient(135deg, rgba(30,41,59,0.97) 0%, rgba(10,15,30,0.99) 100%);
          border: 1px solid rgba(255,255,255,0.08);
        }

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
          margin-bottom: 10px;
        }
        .badge-league { background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.2); color: #f59e0b; }
        .badge-cup    { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2); color: #818cf8; }

        .score-team { flex: 1; text-align: center; }
        .score-team-label { font-size: 0.62rem; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
        .vs-sep { font-family: 'Bebas Neue', sans-serif; font-size: 1.4rem; color: #1e293b; padding: 0 6px; }

        /* Barra de progresso segmentada estilo liga */
        .liga-bar-wrap { margin-top: 12px; }
        .liga-bar-labels { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .liga-bar-label { font-size: 0.6rem; color: #475569; }
        .liga-bar-bg { height: 6px; background: rgba(255,255,255,0.05); border-radius: 99px; overflow: hidden; position: relative; }
        .liga-bar-white { height: 100%; border-radius: 99px 0 0 99px; background: linear-gradient(90deg, rgba(226,232,240,0.8), rgba(148,163,184,0.5)); transition: width 0.5s; }
        .liga-bar-black { position: absolute; right: 0; top: 0; height: 100%; border-radius: 0 99px 99px 0; background: linear-gradient(270deg, rgba(100,116,139,0.6), rgba(51,65,85,0.4)); }
        .liga-meta { display: flex; justify-content: space-between; margin-top: 5px; }
        .liga-meta-val { font-size: 0.6rem; color: #334155; }

        .palmares-card {
          background: linear-gradient(135deg, rgba(30,41,59,0.97), rgba(10,15,30,0.99));
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          overflow: hidden;
        }
        .team-col { flex: 1; padding: 14px 12px; text-align: center; }
        .team-col-white { border-right: 1px solid rgba(255,255,255,0.05); }
        .trophy-count { font-family: 'Bebas Neue', sans-serif; font-size: 2.8rem; line-height: 1; color: white; }
        .trophy-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; margin-top: 2px; }

        .comp-bar-bg { height: 3px; background: rgba(100,116,139,0.2); border-radius: 99px; overflow: hidden; margin: 8px 14px 0; }
        .comp-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, rgba(226,232,240,0.6), rgba(226,232,240,0.3)); }

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
      `}</style>

      <div className="home-page space-y-4 pb-10">

        {/* Header compacto */}
        <div style={{paddingTop:10, paddingBottom:2}}>
          <div style={{display:'flex', alignItems:'baseline', gap:8, marginBottom:1}}>
            <span style={{fontSize:'1.4rem'}}>⚽</span>
            <h1 className="display-font" style={{fontSize:'1.8rem', color:'white', lineHeight:1}}>
              Futebol das Terças
            </h1>
          </div>
          <p style={{fontSize:'0.68rem', color:'#334155', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight:600}}>
            Jogos · Resultados · Títulos
          </p>
        </div>

        {/* Banner votação MVP */}
        {matchVotacao && (
          <a href="/votar" style={{
            display:'block',
            background:'linear-gradient(135deg, rgba(28,25,23,0.98), rgba(15,10,5,0.99))',
            border:'1px solid rgba(251,191,36,0.3)',
            borderRadius:16,
            padding:'14px 16px',
            textDecoration:'none',
            position:'relative',
            overflow:'hidden',
          }}>
            <div style={{position:'absolute', right:-10, top:-10, fontSize:'5rem', opacity:0.06, transform:'rotate(15deg)'}}>⭐</div>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:'0.62rem', color:'#f59e0b', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:700, marginBottom:3}}>
                  ⭐ Votação MVP aberta
                </div>
                <div style={{fontSize:'0.9rem', fontWeight:700, color:'white'}}>
                  Vota no melhor em campo
                </div>
                {horasVotacao !== null && (
                  <div style={{fontSize:'0.7rem', color:'#78716c', marginTop:2}}>
                    Fecha em {horasVotacao}h
                  </div>
                )}
              </div>
              <div style={{background:'rgba(251,191,36,0.15)', border:'1px solid rgba(251,191,36,0.25)', borderRadius:10, padding:'8px 14px', fontSize:'0.75rem', fontWeight:700, color:'#f59e0b', flexShrink:0}}>
                Votar →
              </div>
            </div>
          </a>
        )}

        {/* Último MVP — só aparece quando não há votação aberta */}
        {!matchVotacao && ultimoMvp && (
          <div style={{
            background:'linear-gradient(135deg, #1c1917 0%, #0f172a 100%)',
            border:'1px solid rgba(251,191,36,0.2)',
            borderRadius:16,
            padding:'14px 16px',
            position:'relative',
            overflow:'hidden',
          }}>
            <div style={{position:'absolute', right:-8, top:-8, fontSize:'5rem', opacity:0.05, transform:'rotate(15deg)', color:'#f59e0b'}}>★</div>
            <div style={{fontSize:'0.62rem', color:'#f59e0b', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:700, marginBottom:10}}>
              ⭐ MVP do último jogo
            </div>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              {ultimoMvp.player.photo_url
                ? <img src={ultimoMvp.player.photo_url} alt={ultimoMvp.player.name} style={{width:52, height:52, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'2px solid rgba(251,191,36,0.35)', boxShadow:'0 0 20px rgba(251,191,36,0.15)'}} />
                : <div style={{width:52, height:52, borderRadius:'50%', flexShrink:0, background:'rgba(251,191,36,0.08)', border:'2px solid rgba(251,191,36,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.4rem', color:'#f59e0b'}}>
                    {ultimoMvp.player.name.charAt(0).toUpperCase()}
                  </div>
              }
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.4rem', color:'white', lineHeight:1, letterSpacing:'0.04em'}}>
                  {ultimoMvp.player.name}
                </div>
                <div style={{fontSize:'0.7rem', color:'#78716c', marginTop:3}}>
                  {ultimoMvp.votos} {ultimoMvp.votos === 1 ? 'voto' : 'votos'} · {ultimoMvp.match?.phase === 'cup' ? '🏆 Taça' : '👑 Camp.'} · Série {ultimoMvp.match?.series_id}
                  {ultimoMvp.match?.match_number ? ` · ${ultimoMvp.match.phase === 'cup' ? `Jogo ${ultimoMvp.match.match_number}` : `Jorn. ${ultimoMvp.match.match_number}`}` : ''}
                </div>
              </div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:'2.5rem', color:'#f59e0b', lineHeight:1, textShadow:'0 0 20px rgba(251,191,36,0.3)'}}>
                {ultimoMvp.votos}
              </div>
            </div>
          </div>
        )}

        {/* Série ativa */}
        {series && (
          <div className="serie-card">
            {/* Cabeçalho */}
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14}}>
              <div>
                <div className="display-font" style={{fontSize:'1.3rem', color:'white', lineHeight:1}}>
                  Série {series.id}
                </div>
                <div style={{fontSize:'0.6rem', color:'#22c55e', letterSpacing:'0.1em', textTransform:'uppercase', fontWeight:700, marginTop:1}}>
                  ● Em curso
                </div>
              </div>
            </div>

            {/* Campeonato */}
            {mostrarLiga && (
              <div style={{background:'rgba(251,191,36,0.04)', border:'1px solid rgba(251,191,36,0.1)', borderRadius:14, padding:'12px 14px', marginBottom: mostrarTaca ? 10 : 0}}>
                <div className="competition-badge badge-league">👑 Campeonato</div>

                {series.league_winner ? (
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <span style={{fontSize:'1.1rem'}}>🏅</span>
                    <span style={{fontSize:'1rem', fontWeight:700, color:'white'}}>
                      {series.league_winner === 'white' ? '⚪ Brancos vencem!' : '⚫ Pretos vencem!'}
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Placar */}
                    <div style={{display:'flex', alignItems:'center', marginBottom:0}}>
                      <div className="score-team">
                        <div className="score-team-label">⚪ Brancos</div>
                        <div className="hero-score">{series.league_white_wins}</div>
                      </div>
                      <div className="vs-sep">—</div>
                      <div className="score-team">
                        <div className="score-team-label">⚫ Pretos</div>
                        <div className="hero-score">{series.league_black_wins}</div>
                      </div>
                    </div>

                    {/* Barra de progresso para 11 vitórias */}
                    <div className="liga-bar-wrap">
                      <div className="liga-bar-bg">
                        <div className="liga-bar-white" style={{
                          width: `${Math.round((series.league_white_wins / META_LIGA) * 100)}%`
                        }} />
                        <div className="liga-bar-black" style={{
                          width: `${Math.round((series.league_black_wins / META_LIGA) * 100)}%`
                        }} />
                      </div>
                      <div className="liga-meta">
                        <span className="liga-meta-val">
                          ⚪ {series.league_white_wins}/{META_LIGA}
                        </span>
                        <span className="liga-meta-val" style={{color:'#1e293b'}}>
                          melhor de {META_LIGA * 2 - 1}
                        </span>
                        <span className="liga-meta-val">
                          {series.league_black_wins}/{META_LIGA} ⚫
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Taça */}
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
                    <div className="vs-sep">—</div>
                    <div className="score-team">
                      <div className="score-team-label">⚫ Pretos</div>
                      <div className="hero-score">{series.cup_black_wins}</div>
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
              <div style={{fontSize:'1.5rem', marginBottom:4}}>{l.icon}</div>
              <div className="display-font" style={{fontSize:'0.85rem', color:'#94a3b8', letterSpacing:'0.06em'}}>{l.label}</div>
            </a>
          ))}
        </div>

      </div>
    </>
  )
}
