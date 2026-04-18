import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
  try {
    const { player_id, pin } = await request.json()
    if (!player_id || !pin) {
      return NextResponse.json({ error: 'Dados em falta' }, { status: 400 })
    }
    const { data: player, error } = await supabase
      .from('players')
      .select('id, name, pin')
      .eq('id', player_id)
      .single()
    if (error || !player) {
      return NextResponse.json({ error: 'Jogador não encontrado' }, { status: 404 })
    }
    if (!player.pin || player.pin !== pin) {
      return NextResponse.json({ error: 'PIN incorreto' }, { status: 401 })
    }
    return NextResponse.json({ ok: true, name: player.name })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
