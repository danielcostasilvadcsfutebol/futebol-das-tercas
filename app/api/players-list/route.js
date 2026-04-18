import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )
  const { data: players } = await supabase
    .from('players')
    .select('id, name, team')
    .eq('active', true)
    .not('pin', 'is', null)
    .order('name')
  return NextResponse.json({ players: players || [] })
}
