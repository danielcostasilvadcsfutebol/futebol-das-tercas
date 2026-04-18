import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Usa a service key (não a anon key) para escrever no Supabase de forma segura
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(request) {
  try {
    const subscription = await request.json()

    // Guarda (ou atualiza) a subscrição na tabela push_subscriptions
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
