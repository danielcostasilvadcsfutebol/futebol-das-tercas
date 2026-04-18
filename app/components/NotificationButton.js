'use client'

import { useState, useEffect } from 'react'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
}

export default function NotificationButton() {
  const [estado, setEstado] = useState('loading')
  const [mostrarModal, setMostrarModal] = useState(false)
  const [mostrarIOSModal, setMostrarIOSModal] = useState(false)
  const [players, setPlayers] = useState([])
  const [playerId, setPlayerId] = useState('')
  const [pin, setPin] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isIOS() && !isInStandaloneMode()) {
      setEstado('ios-instalar')
      return
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setEstado('nao-suportado')
      return
    }
    if (Notification.permission === 'granted') setEstado('ativo')
    else if (Notification.permission === 'denied') setEstado('bloqueado')
    else setEstado('inativo')
  }, [])

  async function abrirModal() {
    // Carrega lista de jogadores ao abrir
    try {
      const res = await fetch('/api/players-list')
      const data = await res.json()
      setPlayers(data.players || [])
    } catch {
      setPlayers([])
    }
    setErro('')
    setPlayerId('')
    setPin('')
    setMostrarModal(true)
  }

  async function ativarNotificacoes() {
    if (!playerId) { setErro('Seleciona o teu nome'); return }
    if (!pin) { setErro('Introduz o teu PIN'); return }

    setLoading(true)
    setErro('')

    try {
      // 1. Verificar PIN
      const verifyRes = await fetch('/api/verify-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, pin }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) {
        setErro(verifyData.error || 'PIN incorreto')
        setLoading(false)
        return
      }

      // 2. Pedir permissão de notificações
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setEstado('bloqueado')
        setMostrarModal(false)
        setLoading(false)
        return
      }

      // 3. Subscrever
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      })

      // 4. Guardar subscrição com player_id
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...subscription.toJSON(), player_id: playerId }),
      })

      if (res.ok) {
        setEstado('ativo')
        setMostrarModal(false)
      } else {
        setErro('Erro ao guardar. Tenta novamente.')
      }
    } catch (err) {
      setErro('Erro: ' + err.message)
    }
    setLoading(false)
  }

  if (estado === 'loading' || estado === 'nao-suportado') return null
  if (estado === 'ativo') return <span title="Notificações ativas" style={{fontSize:'1.1rem'}}>🔔</span>
  if (estado === 'bloqueado') return <span title="Notificações bloqueadas" style={{fontSize:'1.1rem', opacity:0.3}}>🔕</span>

  // iOS em browser normal
  if (estado === 'ios-instalar') {
    return (
      <>
        <button
          onClick={() => setMostrarIOSModal(true)}
          className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full transition"
        >
          📲 Instalar app
        </button>

        {mostrarIOSModal && (
          <div
            className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-4"
            onClick={() => setMostrarIOSModal(false)}
          >
            <div
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm text-white mb-8"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold mb-4 text-center">📲 Instalar no iPhone</h2>
              <p className="text-slate-300 text-sm mb-4 text-center">
                Para receber notificações, instala a app no ecrã inicial:
              </p>
              <ol className="space-y-3 text-sm text-slate-200">
                <li className="flex items-start gap-3">
                  <span className="bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">1</span>
                  <span>Toca no botão de <strong>partilha</strong> <span className="bg-slate-700 px-1.5 py-0.5 rounded text-xs">⬆️</span> na barra do Safari</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">2</span>
                  <span>Seleciona <strong>"Adicionar ao ecrã inicial"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-slate-700 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 font-bold text-xs">3</span>
                  <span>Abre a app pelo <strong>ícone ⚽ no ecrã inicial</strong> e ativa as notificações</span>
                </li>
              </ol>
              <button
                onClick={() => setMostrarIOSModal(false)}
                className="mt-6 w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  // Android / outros — mostra botão que abre modal de identificação
  return (
    <>
      <button
        onClick={abrirModal}
        className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full transition"
      >
        🔔 Ativar alertas
      </button>

      {mostrarModal && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-4"
          onClick={() => setMostrarModal(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm text-white mb-8 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h2 className="text-lg font-bold">🔔 Ativar Notificações</h2>
              <p className="text-slate-400 text-sm mt-1">Identifica-te para receberes alertas personalizados</p>
            </div>

            <div>
              <label className="text-slate-400 text-xs mb-1 block">Quem és tu?</label>
              <select
                value={playerId}
                onChange={e => setPlayerId(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 border border-slate-600 text-sm focus:outline-none focus:border-green-500"
              >
                <option value="">— Seleciona o teu nome —</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 text-xs mb-1 block">PIN pessoal</label>
              <input
                type="password"
                placeholder="••••"
                maxLength={8}
                value={pin}
                onChange={e => setPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && ativarNotificacoes()}
                className="w-full bg-slate-700 text-white rounded-xl px-3 py-2.5 border border-slate-600 text-sm focus:outline-none focus:border-green-500 text-center tracking-widest text-lg"
              />
              <p className="text-slate-600 text-xs mt-1">O mesmo PIN que usas para votar no MVP</p>
            </div>

            {erro && (
              <div className="bg-red-500/20 border border-red-500/40 rounded-xl px-3 py-2 text-red-400 text-sm text-center">
                {erro}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setMostrarModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2.5 rounded-xl transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={ativarNotificacoes}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition text-sm"
              >
                {loading ? 'A verificar...' : 'Ativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
