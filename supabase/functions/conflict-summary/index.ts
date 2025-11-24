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

    // 1) Check existing cached summary
    let query = supabase.from('conflict_summaries').select('*')
    if (conflictId) {
      query = query.eq('conflict_id', conflictId)
    } else {
      // Country summary: conflict_id is null, country_id matches
      query = query.eq('country_id', countryId).is('conflict_id', null)
    }

    const { data: existing, error: existingErr } = await query.maybeSingle()

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

    const conflictName = body.conflictName || (existing?.conflict_name as string | undefined)
    const countryName = body.countryName || (countryId ? `country ID ${countryId}` : 'the country in question')

    // 2) Generate new summary via OpenAI
    let prompt = ''
    if (conflictId) {
      const cName = conflictName || `Conflict ${conflictId}`
      prompt = `Write an 8–10 sentence neutral, factual summary in UK English of the armed conflict called "${cName}" in ${countryName}.
Explain briefly:
- Who the main parties are
- Historical and political background
- Main causes and triggers
- Geographic scope and approximate time period
- Scale of violence and humanitarian impact
Avoid jargon and do not speculate beyond widely known facts.`
    } else {
      // Country summary
      prompt = `Write an 8–10 sentence neutral, factual summary in UK English of the recent armed conflict situation in ${countryName}.
Focus on:
- The main active conflicts and armed groups currently operating in the country
- The general security situation and recent trends in violence
- Humanitarian impact and displacement
- Brief historical context of instability
Avoid jargon and do not speculate beyond widely known facts.`
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
        max_tokens: 600,
        temperature: 1,
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
        conflict_id: conflictId, // null for country summary
        country_id: countryId ?? null,
        summary_text: summary,
        model: MODEL,
        last_generated_at: new Date().toISOString(),
      })

    if (upsertErr) {
      console.error('Error upserting conflict_summaries', upsertErr)
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
