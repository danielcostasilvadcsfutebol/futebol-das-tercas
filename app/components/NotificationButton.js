'use client'

import { useState, useEffect } from 'react'

// Converte a VAPID public key para o formato correto
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

export default function NotificationButton() {
  const [estado, setEstado] = useState('desconhecido') // 'desconhecido' | 'ativo' | 'bloqueado' | 'nao-suportado'

  useEffect(() => {
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
      if (permission !== 'granted') {
        setEstado('bloqueado')
        return
      }

      const registration = await navigator.serviceWorker.ready

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        ),
      })

      // Envia a subscrição para guardar no Supabase
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })

      if (res.ok) {
        setEstado('ativo')
      }
    } catch (err) {
      console.error('Erro ao ativar notificações:', err)
    }
  }

  // Não mostra nada se já está ativo ou não é suportado
  if (estado === 'ativo' || estado === 'nao-suportado' || estado === 'desconhecido') {
    return null
  }

  if (estado === 'bloqueado') {
    return (
      <span className="text-xs text-slate-500 cursor-not-allowed" title="Notificações bloqueadas no browser">
        🔕
      </span>
    )
  }

  return (
    <button
      onClick={ativarNotificacoes}
      className="text-slate-400 hover:text-white transition text-xs flex items-center gap-1"
      title="Ativar notificações"
    >
      🔔
    </button>
  )
}
