import { supabase } from '../lib/supabase'
import TitulosClient from './TitulosClient'

export const revalidate = 0

export default async function Titulos() {
  const { data: series } = await supabase
    .from('series')
    .select('*')
    .order('id', { ascending: false }) // mais recente primeiro

  const finished = series?.filter(s => s.status === 'finished') || []
  const totalCampBrancos = finished.filter(s => s.league_winner === 'white').length
  const totalCampPretos  = finished.filter(s => s.league_winner === 'black').length
  const totalTacaBrancos = finished.filter(s => s.cup_winner === 'white').length
  const totalTacaPretos  = finished.filter(s => s.cup_winner === 'black').length

  return (
    <TitulosClient
      series={series || []}
      totalCampBrancos={totalCampBrancos}
      totalCampPretos={totalCampPretos}
      totalTacaBrancos={totalTacaBrancos}
      totalTacaPretos={totalTacaPretos}
    />
  )
}
