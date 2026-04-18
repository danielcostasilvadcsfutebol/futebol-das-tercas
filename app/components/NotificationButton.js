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

  useEffect(() => {
    // iPhone em browser normal → mostrar instrução para instalar
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

  if (estado === 'ativo') {
    return <span title="Notificações ativas">🔔</span>
  }

  if (estado === 'bloqueado') {
    return <span title="Notificações bloqueadas no browser" className="opacity-30">🔕</span>
  }

  // iPhone no browser normal → instrução para instalar
  if (estado === 'ios-instalar') {
    return (
      <span
        title="Para receber notificações: partilha → Adicionar ao ecrã inicial"
        className="text-slate-400 text-xs cursor-help"
      >
        📲
      </span>
    )
  }

  return (
    <button
      onClick={ativarNotificacoes}
      title="Ativar notificações"
      className="text-slate-400 hover:text-white transition"
    >
      🔔
    </button>
  )
}
