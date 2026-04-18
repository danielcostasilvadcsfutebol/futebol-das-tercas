import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

webpush.setVapidDetails(
  'mailto:' + process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export async function POST(request) {
  try {
    // Protege a rota com uma chave secreta simples
    const authHeader = request.headers.get('x-admin-key')
    if (authHeader !== process.env.ADMIN_NOTIFY_KEY) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { title, body, url } = await request.json()

    // Vai buscar todas as subscrições guardadas
    const { data: rows, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')

    if (error) throw error

    const payload = JSON.stringify({ title, body, url: url || '/' })

    // Envia para cada subscrição
    const results = await Promise.allSettled(
      rows.map((row) =>
        webpush.sendNotification(row.subscription, payload)
      )
    )

    const enviadas = results.filter((r) => r.status === 'fulfilled').length
    const falhadas = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({ enviadas, falhadas })
  } catch (err) {
    console.error('Erro ao enviar notificação:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
