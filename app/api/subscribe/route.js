import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  // ← createClient AQUI DENTRO, não lá fora
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  try {
    const subscription = await request.json()

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        { endpoint: subscription.endpoint, subscription: subscription },
        { onConflict: 'endpoint' }
      )

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Erro ao guardar subscrição:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
