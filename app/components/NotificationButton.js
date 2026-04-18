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

  async function ativarNotificacoes() {
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setEstado('bloqueado'); return }
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      })
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })
      if (res.ok) setEstado('ativo')
    } catch (err) {
      console.error('Erro:', err)
    }
  }

  if (estado === 'loading' || estado === 'nao-suportado') return null
  if (estado === 'ativo') return <span className="text-lg" title="Notificações ativas">🔔</span>
  if (estado === 'bloqueado') return <span className="text-lg opacity-30" title="Bloqueado">🔕</span>

  // iOS em browser normal
  if (estado === 'ios-instalar') {
    return (
      <>
        <button
          onClick={() => setMostrarModal(true)}
          className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full transition"
        >
          📲 Instalar app
        </button>

        {mostrarModal && (
          <div
            className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-4"
            onClick={() => setMostrarModal(false)}
          >
            <div
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm text-white mb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold mb-4 text-center">📲 Instalar no iPhone</h2>
              <p className="text-slate-300 text-sm mb-4 text-center">
                Para receber notificações de jogos, instala a app no ecrã inicial:
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
                onClick={() => setMostrarModal(false)}
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

  // Android / outros
  return (
    <button
      onClick={ativarNotificacoes}
      className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full transition"
    >
      🔔 Ativar alertas
    </button>
  )
}
