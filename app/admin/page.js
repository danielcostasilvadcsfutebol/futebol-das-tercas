'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PASSWORD = 'futebol2024'

export default function Admin() {
  const [autenticado, setAutenticado] = useState(false)
  const [password, setPassword] = useState('')
  const [tab, setTab] = useState('jogos')
  const [series, setSeries] = useState([])
  const [players, setPlayers] = useState([])
  const [matches, setMatches] = useState([])
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' })

  const [novoJogo, setNovoJogo] = useState({
    date: new Date().toISOString().split('T')[0],
    series_id: '',
    phase: 'cup',
    white_wins: 0,
    black_wins: 0,
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
      .select('*, series(id), match_players(played_for, players(name))')
      .order('date', { ascending: false })
      .limit(20)
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

  const togglePlayer = (playerId, team) => {
    const field = team === 'white' ? 'white_players' : 'black_players'
    setNovoJogo(prev => ({
      ...prev,
      [field]: prev[field].includes(playerId)
        ? prev[field].filter(id => id !== playerId)
        : [...prev[field], playerId]
    }))
  }

  const submeterJogo = async () => {
    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        date: novoJogo.date,
        series_id: novoJogo.series_id,
        phase: novoJogo.phase,
        white_wins: parseInt(novoJogo.white_wins),
        black_wins: parseInt(novoJogo.black_wins),
      })
      .select().single()

    if (error) { mostrarMensagem('erro', 'Erro: ' + error.message); return }

    const matchPlayers = [
      ...novoJogo.white_players.map(id => ({ match_id: match.id, player_id: id, played_for: 'white' })),
      ...novoJogo.black_players.map(id => ({ match_id: match.id, player_id: id, played_for: 'black' })),
    ]
    if (matchPlayers.length > 0) await supabase.from('match_players').insert(matchPlayers)

    const serieAtual = series.find(s => s.id === parseInt(novoJogo.series_id))
    if (serieAtual) {
      const updates = {}
      if (novoJogo.phase === 'cup') {
        updates.cup_white_wins = (serieAtual.cup_white_wins || 0) + parseInt(novoJogo.white_wins)
        updates.cup_black_wins = (serieAtual.cup_black_wins || 0) + parseInt(novoJogo.black_wins)
        if (updates.cup_white_wins >= 2) updates.cup_winner = 'white'
        if (updates.cup_black_wins >= 2) updates.cup_winner = 'black'
      } else {
        updates.league_white_wins = (serieAtual.league_white_wins || 0) + parseInt(novoJogo.white_wins)
        updates.league_black_wins = (serieAtual.league_black_wins || 0) + parseInt(novoJogo.black_wins)
        if (updates.league_white_wins >= 11) updates.league_winner = 'white'
        if (updates.league_black_wins >= 11) updates.league_winner = 'black'
      }
      if (updates.cup_winner && updates.league_winner) updates.status = 'finished'
      await supabase.from('series').update(updates).eq('id', novoJogo.series_id)
    }

    mostrarMensagem('ok', '✅ Jogo guardado!')
    setNovoJogo(prev => ({ ...prev, white_wins: 0, black_wins: 0, white_players: [], black_players: [] }))
    carregarDados()
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

  if (!autenticado) {
    return (
      <div className="max-w-xs mx-auto mt-16 space-y-4">
        <h1 className="text-2xl font-bold text-white text-center">🔒 Área Admin</h1>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (password === PASSWORD ? setAutenticado(true) : alert('Password incorreta'))}
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600 focus:outline-none focus:border-green-500"
        />
        <button
          onClick={() => password === PASSWORD ? setAutenticado(true) : alert('Password incorreta')}
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

      {tab === 'jogos' && (
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 space-y-4">
          <h2 className="text-lg font-bold text-white">Registar Jogo</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Data</label>
              <input type="date" value={novoJogo.date}
                onChange={e => setNovoJogo(p => ({ ...p, date: e.target.value }))}
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 border border-slate-600 text-sm" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">Fase</label>
              <select value={novoJogo.phase}
                onChange={e => setNovoJogo(p => ({ ...p, phase: e.target.value }))}
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 border border-slate-600 text-sm">
                <option value="cup">🏆 Taça</option>
                <option value="league">👑 Campeonato</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 text-xs mb-1 block">⚪ Vitórias Brancos</label>
              <input type="number" min="0" max="20" value={novoJogo.white_wins}
                onChange={e => setNovoJogo(p => ({ ...p, white_wins: e.target.value }))}
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 border border-slate-600 text-sm text-center font-bold" />
            </div>
            <div>
              <label className="text-slate-400 text-xs mb-1 block">⚫ Vitórias Pretos</label>
              <input type="number" min="0" max="20" value={novoJogo.black_wins}
                onChange={e => setNovoJogo(p => ({ ...p, black_wins: e.target.value }))}
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2 border border-slate-600 text-sm text-center font-bold" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-slate-400 text-xs mb-2">⚪ Equipa Branca</p>
              <div className="space-y-1
