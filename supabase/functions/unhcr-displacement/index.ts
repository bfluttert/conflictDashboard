// Supabase Edge Function (Deno)
// Fetch UNHCR displacement metrics for a given ISO3 country code.
// Returns refugees + asylum seekers (country of origin) and IDPs (country level) for the latest available year.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Simple helper to find the latest year present in a set of rows
function latestYear(rows: any[], yearField: string): number | null {
  const years = rows
    .map((r) => Number(r[yearField]))
    .filter((n) => Number.isFinite(n)) as number[]
  if (!years.length) return null
  return Math.max(...years)
}

serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    const { iso3 } = await req.json().catch(() => ({})) as { iso3?: string }
    if (!iso3 || typeof iso3 !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing iso3' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
    }

    // Refugees + Asylum seekers by country of origin (end-year stocks)
    // Docs: https://api.unhcr.org/docs/refugee-statistics.html (population endpoint)
    // Use cf_type=ISO to interpret ISO3 codes in CoO (coo)
    const popUrl = new URL('https://api.unhcr.org/population/v1/population/')
    popUrl.searchParams.set('cf_type', 'ISO')
    popUrl.searchParams.set('coo', iso3.toUpperCase())
    // Limit rows; we only need aggregates by year
    popUrl.searchParams.set('limit', '1000')

    const popRes = await fetch(popUrl.toString(), { headers: { Accept: 'application/json' } })
    if (!popRes.ok) throw new Error(`UNHCR population fetch failed: ${popRes.status}`)
    const popJson = await popRes.json()
    const popRows: any[] = Array.isArray(popJson?.data)
      ? popJson.data
      : (Array.isArray(popJson?.results) ? popJson.results : [])

    const yPop = latestYear(popRows, 'year')
    let refugees = 0
    let asylum_seekers = 0
    let idps: number | undefined
    if (yPop) {
      for (const r of popRows) {
        if (Number(r.year) !== yPop) continue
        const ref = Number((r.refugees ?? r.Refugees ?? 0)) || 0
        const asy = Number((r.asylum_seekers ?? r.Asylum_seekers ?? r.asylumSeekers ?? 0)) || 0
        const idpVal = Number((r.idps ?? r.IDPs ?? r.idp ?? 0)) || 0
        refugees += ref
        asylum_seekers += asy
        idps = (idps ?? 0) + idpVal
      }
    }

    return new Response(
      JSON.stringify({
        iso3: iso3.toUpperCase(),
        refugees,
        asylum_seekers,
        idps,
        year: yPop,
        source: 'UNHCR Population API',
      }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    )
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
})
