import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { fingerprint, photosToAdd = 0 } = await req.json()
    
    if (!fingerprint) {
      return new Response(
        JSON.stringify({ error: 'Missing fingerprint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: events } = await supabaseClient
      .from('analytics_events')
      .select('event_data')
      .eq('user_fingerprint', fingerprint)
      .eq('event_type', 'photos_uploaded')

    const totalUsed = events?.reduce((sum, event) => 
      sum + (event.event_data?.count || 0), 0) || 0
    
    const limit = 100
    const remaining = Math.max(0, limit - totalUsed)
    const canAdd = photosToAdd <= remaining

    return new Response(
      JSON.stringify({
        used: totalUsed,
        remaining,
        limit,
        canAdd,
        photosToAdd
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})