'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const EMAIL = 'danielcostasilva.dcs@gmail.com'
const PIN = '9663'

export default function Admin() {
  const [autenticado, setAutenticado] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tab, setTab] = useState('jogos')
  const [series, setSeries] = useState([])
  const [players, setPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' })
  const [editarResultado, setEditarResultado] = useState(null)
  const [editarJogo, setEditarJogo] = useState(null)
  const [votacaoMvp, setVotacaoMvp] = useState(null) // { matchId, players: [], votosExistentes: [] }

  const [novoJogo, setNovoJogo] = useState({
    date: new Date().toISOString().split('T')[0],
    series_id: '',
    phase: 'league',
    match_number: '',
    white_score: '',
    black_score: '',
    white_players: [],
    black_players: [],
  })

  const [novoJogador, setNovoJogador] = useState({ name: '', team: 'white' })
  const [editSerie, setEditSerie] = useState(null)

  useEffect(() => {
    if (autenticado) carregarDados()
  }, [autenticado])

  const carregarDados = async () => {
    const { data: s } = await supabase.from('series').select('*').order('id')
    const { data: p } = await supabase.from('players').select('*').order('name')
    const { data: m } = await supabase
      .from('matches')
      .select('*, series(id), match_players(played_for, players(id, name))')
      .order('date', { ascending: false })
    setSeries(s || [])
    setPlayers(p || [])
    setMatches(m || [])
    const serieAtiva = s?.find(s => s.status === 'active')
    if (serieAtiva) setNovoJogo(prev => ({ ...prev, series_id: serieAtiva.id }))
  }

  const mostrarMensagem = (tipo, texto) => {
    setMensagem({ tipo, texto })
    setTimeout(() => setMensagem({ tipo: '', texto: '' }), 3000)
  }

  const tentarLogin = () => {
    if (email === EMAIL && password === PIN) {
      setAutenticado(true)
    } else {
      alert('E-mail ou PIN incorretos')
    }
  }

  const togglePlayer = (playerId, team) => {
    const field = team === 'white' ? 'white_players' : 'black_players'
    setNovoJogo(prev => ({
      ...prev,
      [field]: prev[field].includes(playerId)
        ? prev[field].filter(id => id !== playerId)
        : [...prev[field], playerId]
    }))
  }

  // Gera as opções de jornada/ronda conforme a competição selecionada
  const gerarOpcoesJornada = (phase) => {
    if (phase === 'cup') {
      // Taça: fases eliminatórias
      return [
        { value: '1', label: 'Jogo 1' },
        { value: '2', label: 'Jogo 2' },
        { value: '3', label: 'Jogo 3' },
        { value: '4', label: 'Jogo 4' },
        { value: '5', label: 'Jogo 5' },
      ]
    } else {
      // Campeonato: jornadas 1–21
      return Array.from({ length: 21 }, (_, i) => ({
        value: String(i + 1),
        label: `Jornada ${i + 1}`,
      }))
    }
  }

  const submeterJogo = async () => {
    if (!novoJogo.series_id) {
      mostrarMensagem('erro', 'Seleciona a série')
      return
    }

    const temResultado = novoJogo.white_score !== '' && novoJogo.black_score !== ''

    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        date: novoJogo.date,
        series_id: novoJogo.series_id,
        phase: novoJogo.phase,
        match_number: novoJogo.match_number ? parseInt(novoJogo.match_number) : null,
        white_wins: temResultado ? parseInt(novoJogo.white_score) : null,
        black_wins: temResultado ? parseInt(novoJogo.black_score) : null,
      })
      .select().single()

    if (error) { mostrarMensagem('erro', 'Erro: ' + error.message); return }

    const matchPlayers = [
      ...novoJogo.white_players.map(id => ({ match_id: match.id, player_id: id, played_for: 'white' })),
      ...novoJogo.black_players.map(id => ({ match_id: match.id, player_id: id, played_for: 'black' })),
    ]
    if (matchPlayers.length > 0) await supabase.from('match_players').insert(matchPlayers)

    if (temResultado) {
      await atualizarSerie(novoJogo.series_id, novoJogo.phase, parseInt(novoJogo.white_score), parseInt(novoJogo.black_score))
    }

    mostrarMensagem('ok', temResultado ? '✅ Jogo guardado com resultado!' : '✅ Jogo agendado!')
    setNovoJogo(prev => ({
      ...prev,
      match_number: '',
      white_score: '',
      black_score: '',
      white_players: [],
      black_players: [],
    }))
    carregarDados()
  }

  const atualizarSerie = async (seriesId, phase, whiteScore, blackScore) => {
    const serieAtual = series.find(s => s.id === parseInt(seriesId))
    if (!serieAtual) return
    const updates = {}
    if (phase === 'cup') {
      updates.cup_white_wins = (serieAtual.cup_white_wins || 0) + whiteScore
      updates.cup_black_wins = (serieAtual.cup_black_wins || 0) + blackScore
      if (updates.cup_white_wins >= 2) updates.cup_winner = 'white'
      if (updates.cup_black_wins >= 2) updates.cup_winner = 'black'
    } else {
      updates.league_white_wins = (serieAtual.league_white_wins || 0) + whiteScore
      updates.league_black_wins = (serieAtual.league_black_wins || 0) + blackScore
      if (updates.league_white_wins >= 11) updates.league_winner = 'white'
      if (updates.league_black_wins >= 11) updates.league_winner = 'black'
    }
    if (updates.cup_winner && updates.league_winner) updates.status = 'finished'
    await supabase.from('series').update(updates).eq('id', seriesId)
  }

  const guardarEdicaoJogo = async () => {
    if (editarJogo.white_score === '' || editarJogo.black_score === '') {
      mostrarMensagem('erro', 'Preenche os dois valores do resultado')
      return
    }
    const matchOriginal = matches.find(m => m.id === editarJogo.id)
    
    // Update match data
    const { error } = await supabase
      .from('matches')
      .update({
        date: editarJogo.date,
        phase: editarJogo.phase,
        match_number: editarJogo.match_number ? parseInt(editarJogo.match_number) : null,
        white_wins: parseInt(editarJogo.white_score),
        black_wins: parseInt(editarJogo.black_score),
      })
      .eq('id', editarJogo.id)

    if (error) { mostrarMensagem('erro', 'Erro: ' + error.message); return }

    // Update match players if changed
    if (editarJogo.white_players !== null) {
      await supabase.from('match_players').delete().eq('match_id', editarJogo.id)
      const matchPlayers = [
        ...editarJogo.white_players.map(id => ({ match_id: editarJogo.id, player_id: id, played_for: 'white' })),
        ...editarJogo.black_players.map(id => ({ match_id: editarJogo.id, player_id: id, played_for: 'black' })),
      ]
      if (matchPlayers.length > 0) await supabase.from('match_players').insert(matchPlayers)
    }

    mostrarMensagem('ok', '✅ Jogo atualizado!')
    setEditarJogo(null)
    carregarDados()
  }

  const guardarResultado = async () => {
    if (editarResultado.white_score === '' || editarResultado.black_score === '') {
      mostrarMensagem('erro', 'Preenche os dois valores do resultado')
      return
    }
    const { error } = await supabase
      .from('matches')
      .update({
        white_wins: parseInt(editarResultado.white_score),
        black_wins: parseInt(editarResultado.black_score),
      })
      .eq('id', editarResultado.id)

    if (error) { mostrarMensagem('erro', 'Erro: ' + error.message); return }

    await atualizarSerie(editarResultado.series_id, editarResultado.phase, parseInt(editarResultado.white_score), parseInt(editarResultado.black_score))

    mostrarMensagem('ok', '✅ Resultado guardado!')
    setEditarResultado(null)
    carregarDados()
  }

  const abrirVotacaoMvp = async (match) => {
    const jogadoresDoJogo = match.match_players?.map(mp => ({
      id: mp.players?.id,
      name: mp.players?.name,
      team: mp.played_for,
    })).filter(p => p.id) || []

    const { data: votosExistentes } = await supabase
      .from('mvp_votes')
      .select('*')
      .eq('match_id', match.id)

    setVotacaoMvp({
      matchId: match.id,
      matchLabel: `${new Date(match.date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })} · Série ${match.series?.id}`,
      players: jogadoresDoJogo,
      votosExistentes: votosExistentes || [],
      novoVoto: '',
    })
  }

  const submeterVotoMvp = async () => {
    if (!votacaoMvp.novoVoto) { mostrarMensagem('erro', 'Seleciona um jogador'); return }
    const { error } = await supabase.from('mvp_votes').insert({
      match_id: votacaoMvp.matchId,
      voted_for_player_id: votacaoMvp.novoVoto,
    })
    if (error) { mostrarMensagem('erro', 'Erro: ' + error.message); return }
    mostrarMensagem('ok', '✅ Voto registado!')
    abrirVotacaoMvp(matches.find(m => m.id === votacaoMvp.matchId))
  }

  const apagarVotosMvp = async (matchId) => {
    if (!confirm('Apagar todos os votos MVP deste jogo?')) return
    await supabase.from('mvp_votes').delete().eq('match_id', matchId)
    mostrarMensagem('ok', '✅ Votos apagados!')
    setVotacaoMvp(null)
  }

  const apagarJogo = async (id) => {
    if (!confirm('Apagar este jogo?')) return
    await supabase.from('match_players').delete().eq('match_id', id)
    await supabase.from('matches').delete().eq('id', id)
    mostrarMensagem('ok', '✅ Jogo apagado!')
    carregarDados()
  }

  const submeterJogador = async () => {
    if (!novoJogador.name.trim()) { mostrarMensagem('erro', 'Indica o nome do jogador'); return }
    const { error } = await supabase.from('players').insert({ name: novoJogador.name.trim(), team: novoJogador.team, active: true })
    if (error) { mostrarMensagem('erro', 'Erro: ' + error.message); return }
    mostrarMensagem('ok', '✅ Jogador adicionado!')
    setNovoJogador({ name: '', team: 'white' })
    carregarDados()
  }

  const toggleJogadorAtivo = async (player) => {
    await supabase.from('players').update({ active: !player.active }).eq('id', player.id)
    carregarDados()
  }

  const guardarSerie = async () => {
    const { error } = await supabase.from('series').update({
      cup_white_wins: parseInt(editSerie.cup_white_wins) || 0,
      cup_black_wins: parseInt(editSerie.cup_black_wins) || 0,
      cup_winner: editSerie.cup_winner || null,
      league_white_wins: parseInt(editSerie.league_white_wins) || 0,
      league_black_wins: parseInt(editSerie.league_black_wins) || 0,
      league_winner: editSerie.league_winner || null,
      status: editSerie.status,
    }).eq('id', editSerie.id)
    if (error) { mostrarMensagem('erro', 'Erro: ' + error.message); return }
    mostrarMensagem('ok', '✅ Série atualizada!')
    setEditSerie(null)
    carregarDados()
  }

  const apagarSerie = async (id) => {
    if (!confirm(`Tens a certeza que queres apagar a Série ${id}? Esta ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('series').delete().eq('id', id)
    if (error) { mostrarMensagem('erro', 'Erro: ' + error.message); return }
    mostrarMensagem('ok', '✅ Série apagada!')
    if (editSerie?.id === id) setEditSerie(null)
    carregarDados()
  }

  const criarSerie = async () => {
    const maxId = Math.max(...series.map(s => s.id), 0)
    const { error } = await supabase.from('series').insert({
      id: maxId + 1,
      status: 'active',
      cup_white_wins: 0, cup_black_wins: 0,
      league_white_wins: 0, league_black_wins: 0,
    })
    if (error) { mostrarMensagem('erro', 'Erro: ' + error.message); return }
    mostrarMensagem('ok', '✅ Nova série criada!')
    carregarDados()
  }

  // Label de jornada/ronda para apresentar
  const labelJornada = (match) => {
    if (!match.match_number) return null
    return match.phase === 'cup' ? `Jogo ${match.match_number}` : `Jornada ${match.match_number}`
  }

  const jogosAgendados = matches.filter(m => m.white_wins === null && m.black_wins === null)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
  const jogosRealizados = matches.filter(m => m.white_wins !== null && m.black_wins !== null)
    .sort((a, b) => new Date(b.date) - new Date(a.date))

  if (!autenticado) {
    return (
      <div className="max-w-xs mx-auto mt-16 space-y-4">
        <h1 className="text-2xl font-bold text-white text-center">🔒 Admin</h1>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">E-mail</label>
          <input
            type="email"
            placeholder="o-teu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:outline-none focus:border-green-500"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs mb-1 block">PIN</label>
          <input
            type="password"
            placeholder="••••"
            maxLength={6}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && tentarLogin()}
            className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:outline-none focus:border-green-500 text-center tracking-widest text-xl"
          />
        </div>
        <button
          onClick={tentarLogin}
          className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 text-white rounded-xl px-4 py-3 font-bold transition"
        >
          Entrar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">⚙️ Admin</h1>
        <button onClick={() => setAutenticado(false)} className="text-slate-400 hover:text-white text-sm transition">Sair</button>
      </div>

      {mensagem.texto && (
        <div className={`rounded-xl p-3 text-center text-sm font-medium ${mensagem.tipo === 'ok' ? 'bg-green-500/20 border border-green-500 text-green-400' : 'bg-red-500/20 border border-red-500 text-red-400'}`}>
          {mensagem.texto}
        </div>
      )}

      <div className="flex gap-1 bg-slate-800 rounded-xl p-1 border border-slate-700 overflow-x-auto">
        {[
          { id: 'jogos', label: '📅 Jogos' },
          { id: 'jogadores', label: '👥 Jogadores' },
          { id: 'titulos', label: '🏆 Títulos' },
          { id: 'historico', label: '📋 Histórico' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-xs sm:text-sm py-2 px-2 rounded-lg font-medium transition whitespace-nowrap ${tab === t.id ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Registar Jogo ── */}
      {tab === 'jogos' && (
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-5">
          <h2 className="text-lg font-bold text-white">Registar Jogo</h2>

          <div>
            <label className="text-slate-400 text-xs mb-1 block">Data</label>
            <input
              type="date"
              value={novoJogo.date}
              onChange={e => setNovoJogo(p => ({ ...p, date: e.target.value }))}
              className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 border border-slate-600 text-sm"
            />
          </div>

          {/* Série + Competição + Jornada numa grelha de 3 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Série</label>
              <select
                value={novoJogo.series_id}
                onChange={e => setNovoJogo(p => ({ ...p, series_id: e.target.value }))}
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 border border-slate-600 text-sm"
              >
                <option value="">Selecionar</option>
                {series.map(s => (
                  <option key={s.id} value={s.id}>Série {s.id} {s.status === 'active' ? '🟢' : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Competição</label>
              <select
                value={novoJogo.phase}
                onChange={e => setNovoJogo(p => ({ ...p, phase: e.target.value, match_number: '' }))}
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 border border-slate-600 text-sm"
              >
                <option value="league">👑 Campeonato</option>
                <option value="cup">🏆 Taça</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">
                {novoJogo.phase === 'cup' ? 'Jogo da Taça' : 'Jornada'}
              </label>
              <select
                value={novoJogo.match_number}
                onChange={e => setNovoJogo(p => ({ ...p, match_number: e.target.value }))}
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 border border-slate-600 text-sm"
              >
                <option value="">— Selecionar —</option>
                {gerarOpcoesJornada(novoJogo.phase).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-2 block">Resultado <span className="text-slate-500">(opcional — pode ser preenchido depois)</span></label>
            <div className="flex items-center gap-3 bg-slate-700 rounded-xl p-3">
              <div className="flex-1 text-center">
                <p className="text-slate-400 text-xs mb-1">⚪ Brancos</p>
                <input
                  type="number" min="0" placeholder="—"
                  value={novoJogo.white_score}
                  onChange={e => setNovoJogo(p => ({ ...p, white_score: e.target.value }))}
                  className="w-full bg-slate-600 text-white rounded-lg px-2 py-2 border border-slate-500 text-2xl font-bold text-center"
                />
              </div>
              <p className="text-slate-400 text-xl font-bold">—</p>
              <div className="flex-1 text-center">
                <p className="text-slate-400 text-xs mb-1">⚫ Pretos</p>
                <input
                  type="number" min="0" placeholder="—"
                  value={novoJogo.black_score}
                  onChange={e => setNovoJogo(p => ({ ...p, black_score: e.target.value }))}
                  className="w-full bg-slate-600 text-white rounded-lg px-2 py-2 border border-slate-500 text-2xl font-bold text-center"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-slate-400 text-xs mb-2 block">Jogadores <span className="text-slate-500">(opcional)</span></label>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700 rounded-xl p-3">
                <p className="text-white text-xs font-semibold mb-2">⚪ Brancos</p>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {players.filter(p => p.active)
                    .sort((a, b) => {
                      if (a.team === 'white' && b.team !== 'white') return -1
                      if (a.team !== 'white' && b.team === 'white') return 1
                      return a.name.localeCompare(b.name)
                    })
                    .map(p => (
                    <label key={p.id + '_w'} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={novoJogo.white_players.includes(p.id)}
                        onChange={() => togglePlayer(p.id, 'white')}
                        className="rounded accent-green-500 w-4 h-4 shrink-0" />
                      <span className="text-slate-300 text-xs leading-tight">
                        {p.name}
                        {p.team !== 'white' && <span className="text-yellow-500"> (conv.)</span>}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-2">{novoJogo.white_players.length} selecionados</p>
              </div>
              <div className="bg-slate-700 rounded-xl p-3">
                <p className="text-white text-xs font-semibold mb-2">⚫ Pretos</p>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {players.filter(p => p.active)
                    .sort((a, b) => {
                      if (a.team === 'black' && b.team !== 'black') return -1
                      if (a.team !== 'black' && b.team === 'black') return 1
                      return a.name.localeCompare(b.name)
                    })
                    .map(p => (
                    <label key={p.id + '_b'} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={novoJogo.black_players.includes(p.id)}
                        onChange={() => togglePlayer(p.id, 'black')}
                        className="rounded accent-green-500 w-4 h-4 shrink-0" />
                      <span className="text-slate-300 text-xs leading-tight">
                        {p.name}
                        {p.team !== 'black' && <span className="text-yellow-500"> (conv.)</span>}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-2">{novoJogo.black_players.length} selecionados</p>
              </div>
            </div>
          </div>

          <button onClick={submeterJogo}
            className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 text-white rounded-xl py-3 font-bold transition">
            Guardar Jogo
          </button>
        </div>
      )}

      {/* ── Tab: Jogadores ── */}
      {tab === 'jogadores' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-3">
            <h2 className="text-lg font-bold text-white">Adicionar Jogador</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Nome</label>
                <input value={novoJogador.name}
                  onChange={e => setNovoJogador(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nome do jogador"
                  className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 border border-slate-600 text-sm" />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block">Equipa</label>
                <select value={novoJogador.team}
                  onChange={e => setNovoJogador(p => ({ ...p, team: e.target.value }))}
                  className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 border border-slate-600 text-sm">
                  <option value="white">⚪ Brancos</option>
                  <option value="black">⚫ Pretos</option>
                </select>
              </div>
            </div>
            <button onClick={submeterJogador}
              className="w-full bg-green-600 hover:bg-green-500 text-white rounded-xl py-2.5 font-bold text-sm transition">
              Adicionar Jogador
            </button>
          </div>

          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <h2 className="text-base font-bold text-white mb-3">Gestão de Jogadores</h2>
            <div className="space-y-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-slate-700 rounded-xl px-3 py-2.5">
                  <div>
                    <p className={`text-sm font-medium ${p.active ? 'text-white' : 'text-slate-500 line-through'}`}>{p.name}</p>
                    <p className="text-xs text-slate-400">{p.team === 'white' ? '⚪ Brancos' : '⚫ Pretos'}</p>
                  </div>
                  <button onClick={() => toggleJogadorAtivo(p)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${p.active ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}>
                    {p.active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Títulos ── */}
      {tab === 'titulos' && (
        <div className="space-y-4">
          <button onClick={criarSerie}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 font-bold text-sm transition">
            + Criar Nova Série
          </button>
          {series.map(s => (
            <div key={s.id} className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white">Série {s.id}</h3>
                <div className="flex gap-2 items-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-300'}`}>
                    {s.status === 'active' ? 'Em curso' : 'Terminada'}
                  </span>
                  <button onClick={() => setEditSerie(editSerie?.id === s.id ? null : { ...s })}
                    className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1 rounded-lg transition">
                    {editSerie?.id === s.id ? 'Cancelar' : 'Editar'}
                  </button>
                  <button onClick={() => apagarSerie(s.id)}
                    className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2.5 py-1 rounded-lg transition">
                    🗑 Apagar
                  </button>
                </div>
              </div>
              {editSerie?.id === s.id ? (
                <div className="space-y-3">
                  <p className="text-slate-400 text-xs font-semibold">👑 Campeonato</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-500 text-xs">Vitórias Brancos</label>
                      <input type="number" value={editSerie.league_white_wins}
                        onChange={e => setEditSerie(p => ({ ...p, league_white_wins: e.target.value }))}
                        className="w-full bg-slate-700 text-white rounded-lg px-3 py-1.5 border border-slate-600 text-sm mt-0.5" />
                    </div>
                    <div>
                      <label className="text-slate-500 text-xs">Vitórias Pretos</label>
                      <input type="number" value={editSerie.league_black_wins}
                        onChange={e => setEditSerie(p => ({ ...p, league_black_wins: e.target.value }))}
                        className="w-full bg-slate-700 text-white rounded-lg px-3 py-1.5 border border-slate-600 text-sm mt-0.5" />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs">Vencedor Campeonato</label>
                    <select value={editSerie.league_winner || ''}
                      onChange={e => setEditSerie(p => ({ ...p, league_winner: e.target.value || null }))}
                      className="w-full bg-slate-700 text-white rounded-lg px-3 py-1.5 border border-slate-600 text-sm mt-0.5">
                      <option value="">Em curso</option>
                      <option value="white">⚪ Brancos</option>
                      <option value="black">⚫ Pretos</option>
                    </select>
                  </div>
                  <p className="text-slate-400 text-xs font-semibold mt-2">🏆 Taça</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-500 text-xs">Vitórias Brancos</label>
                      <input type="number" value={editSerie.cup_white_wins}
                        onChange={e => setEditSerie(p => ({ ...p, cup_white_wins: e.target.value }))}
                        className="w-full bg-slate-700 text-white rounded-lg px-3 py-1.5 border border-slate-600 text-sm mt-0.5" />
                    </div>
                    <div>
                      <label className="text-slate-500 text-xs">Vitórias Pretos</label>
                      <input type="number" value={editSerie.cup_black_wins}
                        onChange={e => setEditSerie(p => ({ ...p, cup_black_wins: e.target.value }))}
                        className="w-full bg-slate-700 text-white rounded-lg px-3 py-1.5 border border-slate-600 text-sm mt-0.5" />
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs">Vencedor Taça</label>
                    <select value={editSerie.cup_winner || ''}
                      onChange={e => setEditSerie(p => ({ ...p, cup_winner: e.target.value || null }))}
                      className="w-full bg-slate-700 text-white rounded-lg px-3 py-1.5 border border-slate-600 text-sm mt-0.5">
                      <option value="">Em curso / Não disputada</option>
                      <option value="white">⚪ Brancos</option>
                      <option value="black">⚫ Pretos</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs">Estado</label>
                    <select value={editSerie.status}
                      onChange={e => setEditSerie(p => ({ ...p, status: e.target.value }))}
                      className="w-full bg-slate-700 text-white rounded-lg px-3 py-1.5 border border-slate-600 text-sm mt-0.5">
                      <option value="active">Em curso</option>
                      <option value="finished">Terminada</option>
                    </select>
                  </div>
                  <button onClick={guardarSerie}
                    className="w-full bg-green-600 hover:bg-green-500 text-white rounded-xl py-2.5 font-bold text-sm transition">
                    Guardar Alterações
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <p>👑 Camp.: {s.league_winner ? (s.league_winner === 'white' ? '⚪ Brancos' : '⚫ Pretos') : `${s.league_white_wins}–${s.league_black_wins}`}</p>
                  <p>🏆 Taça: {s.id === 6 ? 'Não disp.' : s.cup_winner ? (s.cup_winner === 'white' ? '⚪ Brancos' : '⚫ Pretos') : `${s.cup_white_wins}–${s.cup_black_wins}`}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Histórico ── */}
      {tab === 'historico' && (
        <div className="space-y-5">

          {/* Jogos agendados */}
          {jogosAgendados.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-yellow-400 mb-3">📆 Agendados ({jogosAgendados.length})</h2>
              <div className="space-y-3">
                {jogosAgendados.map(match => (
                  <div key={match.id} className="bg-slate-800 rounded-xl p-3 border border-yellow-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-300 text-xs font-medium">
                          {new Date(match.date).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-slate-400 text-xs">
                          Série {match.series?.id} · {match.phase === 'cup' ? '🏆 Taça' : '👑 Camp.'}
                          {match.match_number ? ` · ${labelJornada(match)}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400 text-xs font-medium bg-yellow-500/10 px-2.5 py-1 rounded-lg">Por realizar</span>
                        <button
                          onClick={() => setEditarResultado({ id: match.id, series_id: match.series_id, phase: match.phase, white_score: '', black_score: '' })}
                          className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-2.5 py-1.5 rounded-lg transition">
                          + Resultado
                        </button>
                        <button onClick={() => apagarJogo(match.id)}
                          className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2.5 py-1.5 rounded-lg transition">
                          🗑
                        </button>
                      </div>
                    </div>

                    {/* Jogadores agendados */}
                    {(() => {
                      const brancos = match.match_players?.filter(mp => mp.played_for === 'white').map(mp => mp.players?.name).filter(Boolean)
                      const pretos = match.match_players?.filter(mp => mp.played_for === 'black').map(mp => mp.players?.name).filter(Boolean)
                      return (brancos?.length > 0 || pretos?.length > 0) ? (
                        <div className="mt-2 pt-2 border-t border-slate-700 grid grid-cols-2 gap-2">
                          <p className="text-slate-400 text-xs">⚪ {brancos?.join(', ')}</p>
                          <p className="text-slate-400 text-xs">⚫ {pretos?.join(', ')}</p>
                        </div>
                      ) : null
                    })()}

                    {editarResultado?.id === match.id && (
                      <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 text-center">
                            <p className="text-slate-400 text-xs mb-1">⚪ Brancos</p>
                            <input type="number" min="0" placeholder="0"
                              value={editarResultado.white_score}
                              onChange={e => setEditarResultado(p => ({ ...p, white_score: e.target.value }))}
                              className="w-full bg-slate-600 text-white rounded-lg px-2 py-2 border border-slate-500 text-xl font-bold text-center" />
                          </div>
                          <p className="text-slate-400 text-lg">—</p>
                          <div className="flex-1 text-center">
                            <p className="text-slate-400 text-xs mb-1">⚫ Pretos</p>
                            <input type="number" min="0" placeholder="0"
                              value={editarResultado.black_score}
                              onChange={e => setEditarResultado(p => ({ ...p, black_score: e.target.value }))}
                              className="w-full bg-slate-600 text-white rounded-lg px-2 py-2 border border-slate-500 text-xl font-bold text-center" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={guardarResultado}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-xl py-2 font-bold text-sm transition">
                            Guardar
                          </button>
                          <button onClick={() => setEditarResultado(null)}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl py-2 font-bold text-sm transition">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jogos realizados */}
          <div>
            <h2 className="text-sm font-bold text-slate-300 mb-3">✅ Realizados ({jogosRealizados.length})</h2>
            <div className="space-y-3">
              {jogosRealizados.map(match => {
                const brancos = match.match_players?.filter(mp => mp.played_for === 'white').map(mp => mp.players?.name).filter(Boolean)
                const pretos = match.match_players?.filter(mp => mp.played_for === 'black').map(mp => mp.players?.name).filter(Boolean)
                const isEditing = editarJogo?.id === match.id
                return (
                  <div key={match.id} className="bg-slate-800 rounded-xl p-3 border border-slate-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-xs">
                          {new Date(match.date).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-slate-300 text-xs">
                          Série {match.series?.id} · {match.phase === 'cup' ? '🏆 Taça' : '👑 Camp.'}
                          {match.match_number ? ` · ${labelJornada(match)}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm bg-slate-700 px-3 py-1 rounded-lg">{match.white_wins} — {match.black_wins}</span>
                        <button
                          onClick={() => {
                            if (isEditing) {
                              setEditarJogo(null)
                            } else {
                              const whitePids = match.match_players?.filter(mp => mp.played_for === 'white').map(mp => mp.players?.id ?? null).filter(Boolean) ?? []
                              const blackPids = match.match_players?.filter(mp => mp.played_for === 'black').map(mp => mp.players?.id ?? null).filter(Boolean) ?? []
                              setEditarJogo({
                                id: match.id,
                                series_id: match.series_id,
                                date: match.date,
                                phase: match.phase,
                                match_number: match.match_number ? String(match.match_number) : '',
                                white_score: String(match.white_wins),
                                black_score: String(match.black_wins),
                                white_players: whitePids,
                                black_players: blackPids,
                              })
                            }
                          }}
                          className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-2.5 py-1.5 rounded-lg transition">
                          {isEditing ? 'Cancelar' : '✏️'}
                        </button>
                        <button onClick={() => apagarJogo(match.id)}
                          className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2.5 py-1.5 rounded-lg transition">
                          🗑
                        </button>
                        <button onClick={() => votacaoMvp?.matchId === match.id ? setVotacaoMvp(null) : abrirVotacaoMvp(match)}
                          className="text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 px-2.5 py-1.5 rounded-lg transition">
                          ⭐
                        </button>
                      </div>
                    </div>
                    {!isEditing && (brancos?.length > 0 || pretos?.length > 0) && (
                      <div className="mt-2 pt-2 border-t border-slate-700 grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-slate-500 text-xs mb-0.5">⚪ Brancos</p>
                          <p className="text-slate-300 text-xs">{brancos?.join(', ')}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-xs mb-0.5">⚫ Pretos</p>
                          <p className="text-slate-300 text-xs">{pretos?.join(', ')}</p>
                        </div>
                      </div>
                    )}

                    {isEditing && (
                      <div className="mt-3 pt-3 border-t border-slate-700 space-y-3">
                        {/* Date + Phase + Match number */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <div>
                            <label className="text-slate-500 text-xs mb-0.5 block">Data</label>
                            <input type="date" value={editarJogo.date}
                              onChange={e => setEditarJogo(p => ({ ...p, date: e.target.value }))}
                              className="w-full bg-slate-700 text-white rounded-lg px-2 py-1.5 border border-slate-600 text-xs" />
                          </div>
                          <div>
                            <label className="text-slate-500 text-xs mb-0.5 block">Competição</label>
                            <select value={editarJogo.phase}
                              onChange={e => setEditarJogo(p => ({ ...p, phase: e.target.value, match_number: '' }))}
                              className="w-full bg-slate-700 text-white rounded-lg px-2 py-1.5 border border-slate-600 text-xs">
                              <option value="league">👑 Campeonato</option>
                              <option value="cup">🏆 Taça</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-slate-500 text-xs mb-0.5 block">{editarJogo.phase === 'cup' ? 'Jogo da Taça' : 'Jornada'}</label>
                            <select value={editarJogo.match_number}
                              onChange={e => setEditarJogo(p => ({ ...p, match_number: e.target.value }))}
                              className="w-full bg-slate-700 text-white rounded-lg px-2 py-1.5 border border-slate-600 text-xs">
                              <option value="">— Selecionar —</option>
                              {gerarOpcoesJornada(editarJogo.phase).map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="flex items-center gap-3 bg-slate-700 rounded-xl p-2">
                          <div className="flex-1 text-center">
                            <p className="text-slate-400 text-xs mb-1">⚪ Brancos</p>
                            <input type="number" min="0" placeholder="0"
                              value={editarJogo.white_score}
                              onChange={e => setEditarJogo(p => ({ ...p, white_score: e.target.value }))}
                              className="w-full bg-slate-600 text-white rounded-lg px-2 py-1.5 border border-slate-500 text-xl font-bold text-center" />
                          </div>
                          <p className="text-slate-400 text-lg">—</p>
                          <div className="flex-1 text-center">
                            <p className="text-slate-400 text-xs mb-1">⚫ Pretos</p>
                            <input type="number" min="0" placeholder="0"
                              value={editarJogo.black_score}
                              onChange={e => setEditarJogo(p => ({ ...p, black_score: e.target.value }))}
                              className="w-full bg-slate-600 text-white rounded-lg px-2 py-1.5 border border-slate-500 text-xl font-bold text-center" />
                          </div>
                        </div>

                        {/* Players */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-700 rounded-xl p-2">
                            <p className="text-white text-xs font-semibold mb-1.5">⚪ Brancos</p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {players.filter(p => p.active)
                                .sort((a, b) => {
                                  if (a.team === 'white' && b.team !== 'white') return -1
                                  if (a.team !== 'white' && b.team === 'white') return 1
                                  return a.name.localeCompare(b.name)
                                })
                                .map(p => (
                                <label key={p.id + '_ew'} className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox"
                                    checked={editarJogo.white_players.includes(p.id)}
                                    onChange={() => setEditarJogo(prev => ({
                                      ...prev,
                                      white_players: prev.white_players.includes(p.id)
                                        ? prev.white_players.filter(id => id !== p.id)
                                        : [...prev.white_players, p.id]
                                    }))}
                                    className="rounded accent-green-500 w-3.5 h-3.5 shrink-0" />
                                  <span className="text-slate-300 text-xs leading-tight">
                                    {p.name}
                                    {p.team !== 'white' && <span className="text-yellow-500"> (conv.)</span>}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="bg-slate-700 rounded-xl p-2">
                            <p className="text-white text-xs font-semibold mb-1.5">⚫ Pretos</p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto">
                              {players.filter(p => p.active)
                                .sort((a, b) => {
                                  if (a.team === 'black' && b.team !== 'black') return -1
                                  if (a.team !== 'black' && b.team === 'black') return 1
                                  return a.name.localeCompare(b.name)
                                })
                                .map(p => (
                                <label key={p.id + '_eb'} className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox"
                                    checked={editarJogo.black_players.includes(p.id)}
                                    onChange={() => setEditarJogo(prev => ({
                                      ...prev,
                                      black_players: prev.black_players.includes(p.id)
                                        ? prev.black_players.filter(id => id !== p.id)
                                        : [...prev.black_players, p.id]
                                    }))}
                                    className="rounded accent-green-500 w-3.5 h-3.5 shrink-0" />
                                  <span className="text-slate-300 text-xs leading-tight">
                                    {p.name}
                                    {p.team !== 'black' && <span className="text-yellow-500"> (conv.)</span>}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button onClick={guardarEdicaoJogo}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-xl py-2 font-bold text-sm transition">
                            Guardar Alterações
                          </button>
                          <button onClick={() => setEditarJogo(null)}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl py-2 font-bold text-sm transition">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Painel de votação MVP */}
                    {votacaoMvp?.matchId === match.id && !isEditing && (
                      <div className="mt-3 pt-3 border-t border-yellow-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-yellow-400 text-xs font-bold">⭐ Votar Melhor em Campo</p>
                          <span className="text-slate-500 text-xs">{votacaoMvp.votosExistentes.length} votos</span>
                        </div>

                        {/* Resultados atuais */}
                        {votacaoMvp.votosExistentes.length > 0 && (() => {
                          const contagemVotos = {}
                          votacaoMvp.votosExistentes.forEach(v => {
                            contagemVotos[v.voted_for_player_id] = (contagemVotos[v.voted_for_player_id] || 0) + 1
                          })
                          return (
                            <div className="space-y-1.5">
                              {votacaoMvp.players
                                .filter(p => contagemVotos[p.id])
                                .sort((a,b) => (contagemVotos[b.id]||0) - (contagemVotos[a.id]||0))
                                .map(p => (
                                <div key={p.id} className="flex items-center gap-2">
                                  <span className="text-slate-300 text-xs w-28 truncate">{p.name}</span>
                                  <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div className="h-full bg-yellow-500 rounded-full" style={{width:`${(contagemVotos[p.id]/votacaoMvp.votosExistentes.length)*100}%`}}></div>
                                  </div>
                                  <span className="text-yellow-400 text-xs font-bold w-4 text-right">{contagemVotos[p.id]}</span>
                                </div>
                              ))}
                            </div>
                          )
                        })()}

                        {/* Adicionar voto */}
                        {votacaoMvp.players.length > 0 ? (
                          <div className="flex gap-2">
                            <select value={votacaoMvp.novoVoto}
                              onChange={e => setVotacaoMvp(p => ({ ...p, novoVoto: e.target.value }))}
                              className="flex-1 bg-slate-700 text-white rounded-lg px-2 py-1.5 border border-slate-600 text-xs">
                              <option value="">— Selecionar jogador —</option>
                              {votacaoMvp.players.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.team === 'white' ? '⚪' : '⚫'})</option>
                              ))}
                            </select>
                            <button onClick={submeterVotoMvp}
                              className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg px-3 text-xs font-bold transition">
                              Votar
                            </button>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-xs">Nenhum jogador associado a este jogo.</p>
                        )}

                        {votacaoMvp.votosExistentes.length > 0 && (
                          <button onClick={() => apagarVotosMvp(match.id)}
                            className="text-xs text-red-400/60 hover:text-red-400 transition">
                            Apagar todos os votos
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
