// Supabase Edge Function: conflict-summary
// Returns an AI-generated cached summary for a conflict.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const MODEL = 'gpt-4o-mini' // small, fast OpenAI model
const TTL_DAYS = 30

type OpenAIChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server not configured: missing Supabase env' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server not configured: missing OPENAI_API_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const body = (await req.json().catch(() => ({}))) as {
      conflictId?: number
      countryId?: number
      conflictName?: string
      countryName?: string
      forceRefresh?: boolean
    }

    const conflictId = body.conflictId ? Number(body.conflictId) : null
    const countryId = body.countryId ? Number(body.countryId) : null

    if (!conflictId && !countryId) {
      return new Response(JSON.stringify({ error: 'Missing conflictId or countryId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const forceRefresh = !!body.forceRefresh

    // MAGIC ID: Use negative country ID for storage to avoid NULL Primary Key violation
    const storageId = conflictId || (countryId ? -countryId : null)

    if (storageId === null) {
      return new Response(JSON.stringify({ error: 'Missing valid identifier' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // 1) Check existing cached summary
    const { data: existing, error: existingErr } = await supabase
      .from('conflict_summaries')
      .select('*')
      .eq('conflict_id', storageId)
      .maybeSingle()

    if (existingErr && existingErr.code !== 'PGRST116') {
      console.error('Error reading conflict_summaries', existingErr)
    }

    if (existing && !forceRefresh) {
      const last = new Date(existing.last_generated_at)
      const ageMs = Date.now() - last.getTime()
      const ttlMs = TTL_DAYS * 24 * 60 * 60 * 1000
      if (ageMs < ttlMs) {
        return new Response(JSON.stringify({ summary: existing.summary_text, model: existing.model, cached: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      }
    }

    const countryName = body.countryName || (countryId ? `country ID ${countryId}` : 'the country in question')

    // 2) Generate new summary via OpenAI
    let prompt = ''
    if (conflictId) {
      const conflictName = body.conflictName || (existing?.summary_text ? 'this conflict' : `Conflict ${conflictId}`)
      prompt = `Write an 8–10 sentence neutral, factual summary in UK English of the armed conflict called "${conflictName}" in ${countryName}.
Explain briefly:
- Who the main parties are
- Historical and political background
- Main causes and triggers
- Geographic scope and approximate time period
- Scale of violence and humanitarian impact
Avoid jargon and do not speculate beyond widely known facts.`
    } else {
      // Country summary (Aggregated National Level)
      prompt = `Act as a senior geopolitical intelligence analyst. Provide a comprehensive, high-level intelligence summary for the situation in ${countryName}, focusing on the aggregated national landscape of conflicts.

The summary should be 8–10 sentences, neutral, factual, and written in UK English.

Focus on:
1. OVERVIEW: A high-level synthesis of all active conflicts and main armed groups operating within ${countryName} transitionally.
2. RECENT DEVELOPMENTS: Summarise general security trends and significant shifts in the conflict landscape over the last 12 months.
3. HUMANITARIAN IMPACT: Describe the cumulative scale of violence, internal and external displacement patterns, and the broader humanitarian crisis.
4. STRATEGIC CONTEXT: Briefly mention the underlying historical or political drivers of instability that connect these various conflicts.

Maintain a professional intelligence-reporting tone. Avoid jargon, bullet points, and do not speculate beyond verified geopolitical facts.`
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are an assistant that writes concise, neutral, factual summaries in UK English.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    })

    if (!openaiRes.ok) {
      const text = await openaiRes.text()
      console.error('OpenAI error', openaiRes.status, text)
      return new Response(
        JSON.stringify({
          error: 'OpenAI request failed',
          openaiStatus: openaiRes.status,
          openaiBody: text,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    const openaiJson = (await openaiRes.json()) as OpenAIChatCompletion
    const summary = openaiJson?.choices?.[0]?.message?.content?.trim()
    if (!summary) {
      return new Response(JSON.stringify({ error: 'OpenAI returned no summary' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // 3) Upsert into conflict_summaries
    const { error: upsertErr } = await supabase
      .from('conflict_summaries')
      .upsert({
        conflict_id: storageId, // Negative for country summary
        country_id: countryId ?? null,
        summary_text: summary,
        model: MODEL,
        last_generated_at: new Date().toISOString(),
      })

    if (upsertErr) {
      console.error('Error upserting conflict_summaries', upsertErr)
      // Even if cache fails, return the summary to the user
    }

    return new Response(JSON.stringify({ summary, model: MODEL, cached: false }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    console.error('Unhandled error in conflict-summary', e)
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
