'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function VotarClient({ match, jogadores }) {
  const [step, setStep] = useState('select-voter') // select-voter | enter-pin | confirm | voted | error | closed
  const [voterPlayer, setVoterPlayer] = useState(null)
  const [candidatos, setCandidatos] = useState([])
  const [votado, setVotado] = useState(null)
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [jaVotou, setJaVotou] = useState(null) // voto anterior se existir

  if (!match || !match.voting_open) {
    return (
      <div style={{textAlign:'center', padding:'60px 20px'}}>
        <div style={{fontSize:'3rem', marginBottom:16}}>🔒</div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif", fontSize:'1.6rem', color:'white', marginBottom:8}}>
          Votação Fechada
        </div>
        <p style={{fontSize:'0.85rem', color:'#475569'}}>
          Não há nenhuma votação MVP aberta neste momento.
        </p>
        <a href="/" style={{display:'inline-block', marginTop:24, fontSize:'0.8rem', color:'#475569', textDecoration:'none'}}>
          ← Início
        </a>
      </div>
    )
  }

  const horasFecho = match.voting_closes_at
    ? Math.max(0, Math.round((new Date(match.voting_closes_at) - new Date()) / 3600000))
    : null

  const selecionarVoter = async (player) => {
    setVoterPlayer(player)
    setErro('')
    // Verificar se já votou
    const { data: votoExistente } = await supabase
      .from('mvp_votes')
      .select('*, players!mvp_votes_voted_for_player_id_fkey(name)')
      .eq('match_id', match.id)
      .eq('voter_player_id', player.id)
      .maybeSingle()

    setJaVotou(votoExistente || null)
    // Candidatos = todos exceto o próprio
    setCandidatos(jogadores.filter(p => p.id !== player.id))
    setStep('enter-pin')
  }

  const validarPin = async () => {
    if (!pin.trim()) { setErro('Insere o teu PIN'); return }
    setLoading(true)
    const { data: player } = await supabase
      .from('players')
      .select('pin')
      .eq('id', voterPlayer.id)
      .single()
    setLoading(false)
    if (!player || player.pin !== pin.trim()) {
      setErro('PIN incorreto')
      return
    }
    setErro('')
    setStep('select-candidate')
  }

  const confirmarVoto = async () => {
    if (!votado) { setErro('Seleciona um jogador'); return }
    setLoading(true)
    // Upsert — se já votou, atualiza
    const { error } = await supabase
      .from('mvp_votes')
      .upsert({
        match_id: match.id,
        voter_player_id: voterPlayer.id,
        voted_for_player_id: votado.id,
        voted_at: new Date().toISOString(),
      }, { onConflict: 'match_id,voter_player_id' })
    setLoading(false)
    if (error) { setErro('Erro ao registar voto: ' + error.message); return }
    setStep('voted')
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        .votar-page { font-family: 'DM Sans', sans-serif; }
        .display-font { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }

        .player-btn {
          width: 100%;
          background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98));
          border-radius: 14px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }
        .player-btn:active { transform: scale(0.98); }
        .player-btn-white { border: 1.5px solid rgba(226,232,240,0.2); }
        .player-btn-black { border: 1.5px solid rgba(30,30,30,0.9); }
        .player-btn-white:hover { border-color: rgba(226,232,240,0.4); }
        .player-btn-black:hover { border-color: rgba(60,60,60,0.9); }
        .player-btn.selected-white { border-color: rgba(226,232,240,0.7); background: rgba(226,232,240,0.08); }
        .player-btn.selected-black { border-color: rgba(100,116,139,0.6); background: rgba(51,65,85,0.3); }
        .player-btn.selected-mvp { border-color: rgba(251,191,36,0.6); background: rgba(251,191,36,0.06); }

        .avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
        .avatar-placeholder { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; flex-shrink: 0; }
        .avatar-w { background: rgba(226,232,240,0.1); border: 1.5px solid rgba(226,232,240,0.15); color: #94a3b8; }
        .avatar-b { background: rgba(15,15,15,0.6); border: 1.5px solid rgba(60,60,60,0.7); color: #64748b; }

        .pin-input {
          width: 100%;
          background: rgba(30,41,59,0.95);
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 16px;
          font-size: 1.8rem;
          font-family: 'Bebas Neue', sans-serif;
          letter-spacing: 0.4em;
          color: white;
          text-align: center;
          outline: none;
          transition: border-color 0.15s;
        }
        .pin-input:focus { border-color: rgba(255,255,255,0.25); }

        .btn-primary {
          width: 100%;
          background: #16a34a;
          color: white;
          border: none;
          border-radius: 14px;
          padding: 14px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.1rem;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        .btn-primary:hover { background: #15803d; }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-secondary {
          width: 100%;
          background: transparent;
          color: #475569;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 12px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: color 0.15s;
          font-family: 'DM Sans', sans-serif;
        }
        .btn-secondary:hover { color: #94a3b8; }

        .step-header {
          margin-bottom: 20px;
        }
        .step-label {
          font-size: 0.62rem;
          color: #334155;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .step-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 1.6rem;
          color: white;
          line-height: 1;
        }
        .step-sub {
          font-size: 0.78rem;
          color: #475569;
          margin-top: 4px;
        }

        .match-info-bar {
          background: linear-gradient(135deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98));
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 12px 14px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .timer-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 99px;
          background: rgba(251,191,36,0.1);
          border: 1px solid rgba(251,191,36,0.2);
          color: #f59e0b;
        }
      `}</style>

      <div className="votar-page pb-12" style={{maxWidth:480, margin:'0 auto'}}>

        {/* Header */}
        <div style={{paddingTop:10, paddingBottom:16}}>
          <div style={{fontSize:'0.62rem', color:'#f59e0b', letterSpacing:'0.12em', textTransform:'uppercase', fontWeight:700, marginBottom:4}}>
            ⭐ MVP
          </div>
          <h1 className="display-font" style={{fontSize:'2.2rem', color:'white', lineHeight:1}}>Votação</h1>
        </div>

        {/* Info do jogo */}
        <div className="match-info-bar">
          <div>
            <div style={{fontSize:'0.85rem', fontWeight:600, color:'white'}}>
              {match.phase === 'cup' ? '🏆 Taça' : '👑 Campeonato'} · Série {match.series_id}
              {match.match_number ? ` · ${match.phase === 'cup' ? `Jogo ${match.match_number}` : `Jornada ${match.match_number}`}` : ''}
            </div>
            <div style={{fontSize:'0.72rem', color:'#475569', marginTop:2}}>
              {new Date(match.date).toLocaleDateString('pt-PT', { weekday:'long', day:'numeric', month:'long' })}
            </div>
          </div>
          {horasFecho !== null && horasFecho > 0 && (
            <div className="timer-badge">⏱ {horasFecho}h</div>
          )}
        </div>

        {/* STEP: Selecionar quem és */}
        {step === 'select-voter' && (
          <div>
            <div className="step-header">
              <div className="step-label">Passo 1 de 3</div>
              <div className="step-title">Quem és tu?</div>
              <div className="step-sub">Seleciona o teu nome na lista de jogadores</div>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {jogadores.map(p => (
                <button key={p.id} className={`player-btn player-btn-${p.team === 'white' ? 'white' : 'black'}`}
                  onClick={() => selecionarVoter(p)}>
                  {p.photo_url
                    ? <img src={p.photo_url} alt={p.name} className="avatar" />
                    : <div className={`avatar-placeholder avatar-${p.team === 'white' ? 'w' : 'b'}`}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                  }
                  <div>
                    <div style={{fontSize:'0.95rem', fontWeight:700, color:'white'}}>{p.name}</div>
                    <div style={{fontSize:'0.65rem', color:'#475569'}}>{p.team === 'white' ? '⚪ Brancos' : '⚫ Pretos'}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP: Inserir PIN */}
        {step === 'enter-pin' && (
          <div>
            <div className="step-header">
              <div className="step-label">Passo 2 de 3</div>
              <div className="step-title">Olá, {voterPlayer?.name}!</div>
              <div className="step-sub">Insere o teu PIN pessoal para continuar</div>
            </div>
            {jaVotou && (
              <div style={{background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.15)', borderRadius:12, padding:'10px 14px', marginBottom:16, fontSize:'0.78rem', color:'#f59e0b'}}>
                Já votaste em <strong>{jaVotou.players?.name}</strong>. Podes alterar o teu voto.
              </div>
            )}
            <input
              className="pin-input"
              type="password"
              inputMode="numeric"
              maxLength={8}
              placeholder="••••"
              value={pin}
              onChange={e => { setPin(e.target.value); setErro('') }}
              onKeyDown={e => e.key === 'Enter' && validarPin()}
              autoFocus
            />
            {erro && <p style={{color:'#ef4444', fontSize:'0.78rem', textAlign:'center', marginTop:8}}>{erro}</p>}
            <div style={{display:'flex', flexDirection:'column', gap:8, marginTop:16}}>
              <button className="btn-primary" onClick={validarPin} disabled={loading}>
                {loading ? 'A verificar...' : 'Continuar →'}
              </button>
              <button className="btn-secondary" onClick={() => { setStep('select-voter'); setPin(''); setErro('') }}>
                ← Voltar
              </button>
            </div>
          </div>
        )}

        {/* STEP: Selecionar candidato */}
        {step === 'select-candidate' && (
          <div>
            <div className="step-header">
              <div className="step-label">Passo 3 de 3</div>
              <div className="step-title">Quem foi o melhor?</div>
              <div className="step-sub">Escolhe o jogador que mais se destacou</div>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:16}}>
              {candidatos.map(p => {
                const selecionado = votado?.id === p.id
                return (
                  <button key={p.id}
                    className={`player-btn ${selecionado ? 'selected-mvp' : `player-btn-${p.team === 'white' ? 'white' : 'black'}`}`}
                    onClick={() => setVotado(p)}>
                    {p.photo_url
                      ? <img src={p.photo_url} alt={p.name} className="avatar"
                          style={selecionado ? {border:'2px solid rgba(251,191,36,0.5)'} : {}} />
                      : <div className={`avatar-placeholder avatar-${p.team === 'white' ? 'w' : 'b'}`}
                          style={selecionado ? {background:'rgba(251,191,36,0.1)', border:'2px solid rgba(251,191,36,0.3)', color:'#f59e0b'} : {}}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                    }
                    <div style={{flex:1}}>
                      <div style={{fontSize:'0.95rem', fontWeight:700, color: selecionado ? '#fbbf24' : 'white'}}>{p.name}</div>
                      <div style={{fontSize:'0.65rem', color:'#475569'}}>{p.team === 'white' ? '⚪ Brancos' : '⚫ Pretos'}</div>
                    </div>
                    {selecionado && <span style={{fontSize:'1.2rem'}}>⭐</span>}
                  </button>
                )
              })}
            </div>
            {erro && <p style={{color:'#ef4444', fontSize:'0.78rem', textAlign:'center', marginBottom:8}}>{erro}</p>}
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              <button className="btn-primary" onClick={confirmarVoto} disabled={!votado || loading}
                style={{background: votado ? '#16a34a' : '#1e293b'}}>
                {loading ? 'A registar...' : `Votar em ${votado?.name || '—'}`}
              </button>
              <button className="btn-secondary" onClick={() => { setStep('enter-pin'); setPin(''); setVotado(null) }}>
                ← Voltar
              </button>
            </div>
          </div>
        )}

        {/* STEP: Voto registado */}
        {step === 'voted' && (
          <div style={{textAlign:'center', padding:'40px 0'}}>
            <div style={{fontSize:'3.5rem', marginBottom:16}}>⭐</div>
            <div className="display-font" style={{fontSize:'1.8rem', color:'white', marginBottom:8}}>
              Voto Registado!
            </div>
            <p style={{fontSize:'0.85rem', color:'#475569', marginBottom:4}}>
              Votaste em <strong style={{color:'#fbbf24'}}>{votado?.name}</strong>
            </p>
            <p style={{fontSize:'0.75rem', color:'#334155'}}>
              como melhor em campo
            </p>
            <a href="/" style={{display:'inline-block', marginTop:32, fontSize:'0.8rem', color:'#475569', textDecoration:'none'}}>
              ← Voltar ao início
            </a>
          </div>
        )}

      </div>
    </>
  )
}
