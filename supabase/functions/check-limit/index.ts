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
    // Use environment variables
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { fingerprint, photosToAdd = 0, action = 'check' } = await req.json()
    
    if (!fingerprint) {
      return new Response(
        JSON.stringify({ error: 'Missing fingerprint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle recording downloads separately from analytics
    if (action === 'record_download' && photosToAdd > 0) {
      try {
        await supabaseClient
          .from('analytics_events')
          .insert({
            session_id: `session_${Date.now()}`,
            event_type: 'download_completed',
            event_data: { photo_count: photosToAdd },
            user_fingerprint: fingerprint,
            created_at: new Date().toISOString()
          });

        return new Response(
          JSON.stringify({ success: true, message: 'Download recorded' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error('Failed to record download:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to record download' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Get download events for this fingerprint (check action)
    const { data: events, error: fetchError } = await supabaseClient
      .from('analytics_events')
      .select('event_data')
      .eq('user_fingerprint', fingerprint)
      .eq('event_type', 'download_completed')

    if (fetchError) {
      console.error('Database fetch error:', fetchError)
    }

    const totalUsed = events?.reduce((sum: number, event: any) => 
      sum + (event.event_data?.photo_count || event.event_data?.photoCount || 0), 0) || 0
    
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
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        used: 0, 
        remaining: 100, 
        limit: 100, 
        canAdd: true, 
        photosToAdd: 0,
        error: 'Server error, allowing request'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})