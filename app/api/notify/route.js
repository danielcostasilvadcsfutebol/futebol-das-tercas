import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { sendPushNotification } from '../../lib/webpush'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  try {
    const authHeader = request.headers.get('x-admin-key')
    if (authHeader !== process.env.ADMIN_NOTIFY_KEY) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { title, body, url } = await request.json()
    const { data: rows, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')

    if (error) throw error

    const payload = JSON.stringify({ title, body, url: url || '/' })

    const results = await Promise.allSettled(
      rows.map((row) =>
        sendPushNotification(row.subscription, payload, {
          publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          privateKey: process.env.VAPID_PRIVATE_KEY,
          email: process.env.VAPID_EMAIL,
        })
      )
    )

    const enviadas = results.filter((r) => r.status === 'fulfilled').length
    const falhadas = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({ enviadas, falhadas })
  } catch (err) {
    console.error('Erro:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
