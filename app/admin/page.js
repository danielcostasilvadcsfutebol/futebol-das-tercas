'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PASSWORD = 'futebol2024'

export default function Admin() {
  const [autenticado, setAutenticado] = useState(false)
  const [password, setPassword] = useState('')
  const [series, setSeries] = useState([])
  const [players, setPlayers] = useState([])
  const [mensagem, setMensagem] = useState('')

  const [novoJogo, setNovoJogo] = useState({
    date: new Date().toISOString().split('T')[0],
    series_id: '',
    phase: 'cup',
    white_wins: 0,
    black_wins: 0,
    white_players: [],
    black_players: [],
  })

  useEffect(() => {
    if (autenticado) {
      carregarDados()
    }
  }, [autenticado])

  const carregarDados = async () => {
    const { data: s } = await supabase.from('series').select('*').order('id')
    const { data: p } = await supabase.from('players').select('*').eq('active', true).order('name')
    setSeries(s || [])
    setPlayers(p || [])
    const serieAtiva = s?.find(s => s.status === 'active')
    if (serieAtiva) setNovoJogo(prev => ({ ...prev, series_id: serieAtiva.id }))
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
    setMensagem('')
    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        date: novoJogo.date,
        series_id: novoJogo.series_id,
        phase: novoJogo.phase,
        white_wins: parseInt(novoJogo.white_wins),
        black_wins: parseInt(novoJogo.black_wins),
      })
      .select()
      .single()

    if (error) { setMensagem('Erro ao guardar jogo: ' + error.message); return }

    const matchPlayers = [
      ...novoJogo.white_players.map(id => ({ match_id: match.id, player_id: id, played_for: 'white' })),
      ...novoJogo.black_players.map(id => ({ match_id: match.id, player_id: id, played_for: 'black' })),
    ]

    if (matchPlayers.length > 0) {
      await supabase.from('match_players').insert(matchPlayers)
    }

    // Atualizar score da série
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

    setMensagem('✅ Jogo guardado com sucesso!')
    carregarDados()
  }

  if (!autenticado) {
    return (
      <div className="max-w-sm mx-auto mt-20 space-y-4">
        <h1 className="text-2xl font-bold text-white text-center">🔒 Área Admin</h1>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 border border-slate-600"
        />
        <button
          onClick={() => password === PASSWORD ? setAutenticado(true) : alert('Password incorreta')}
          className="w-full bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-3 font-bold"
        >
          Entrar
        </button>
      </div>
    )
  }

  const serieAtiva = series.find(s => s.status === 'active')
  const phase = serieAtiva?.cup_winner ? 'league' : 'cup'

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white text-center">⚙️ Admin</h1>

      {mensagem && (
        <div className="bg-green-500/20 border border-green-500 text-green-400 rounded-xl p-4 text-center">
          {mensagem}
        </div>
      )}

      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-4">
        <h2 className="text-xl font-bold text-white">Registar Jogo</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 text-sm">Data</label>
            <input
              type="date"
              value={novoJogo.date}
              onChange={e => setNovoJogo(prev => ({ ...prev, date: e.target.value }))}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-2 border border-slate-600 mt-1"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm">Fase</label>
            <select
              value={novoJogo.phase}
              onChange={e => setNovoJogo(prev => ({ ...prev, phase: e.target.value }))}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-2 border border-slate-600 mt-1"
            >
              <option value="cup">🏆 Taça</option>
              <option value="league">👑 Campeonato</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 text-sm">Vitórias ⚪ Brancos</label>
            <input
              type="number" min="0" max="11"
              value={novoJogo.white_wins}
              onChange={e => setNovoJogo(prev => ({ ...prev, white_wins: e.target.value }))}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-2 border border-slate-600 mt-1"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm">Vitórias ⚫ Pretos</label>
            <input
              type="number" min="0" max="11"
              value={novoJogo.black_wins}
              onChange={e => setNovoJogo(prev => ({ ...prev, black_wins: e.target.value }))}
              className="w-full bg-slate-700 text-white rounded-xl px-4 py-2 border border-slate-600 mt-1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-slate-400 text-sm mb-2 block">⚪ Jogadores Brancos</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {players.filter(p => p.team === 'white').map(p => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novoJogo.white_players.includes(p.id)}
                    onChange={() => togglePlayer(p.id, 'white')}
                    className="rounded"
                  />
                  <span className="text-slate-300 text-sm">{p.name}</span>
                </label>
              ))}
              {players.filter(p => p.team === 'black').map(p => (
                <label key={p.id + '_guest'} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novoJogo.white_players.includes(p.id)}
                    onChange={() => togglePlayer(p.id, 'white')}
                    className="rounded"
                  />
                  <span className="text-slate-300 text-sm">{p.name} <span className="text-yellow-500 text-xs">(convidado)</span></span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-slate-400 text-sm mb-2 block">⚫ Jogadores Pretos</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {players.filter(p => p.team === 'black').map(p => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novoJogo.black_players.includes(p.id)}
                    onChange={() => togglePlayer(p.id, 'black')}
                    className="rounded"
                  />
                  <span className="text-slate-300 text-sm">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={submeterJogo}
          className="w-full bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-3 font-bold transition"
        >
          Guardar Jogo
        </button>
      </div>
    </div>
  )
}
