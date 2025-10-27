import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: { method: string; json: () => PromiseLike<{ fingerprint: any; photosToAdd?: 0 | undefined }> | { fingerprint: any; photosToAdd?: 0 | undefined } }) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use hardcoded values since env vars might not be available
    const supabaseClient = createClient(
      'https://vnustygjnsuncyhnqlxl.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZudXN0eWdqbnN1bmN5aG5xbHhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQwMTU1MSwiZXhwIjoyMDc2OTc3NTUxfQ.cGfW_MMtrKDtNDv8pOQ-gESnG7byvUUpWus3nrTR7Ig'
    )

    const { fingerprint, photosToAdd = 0 } = await req.json()
    
    if (!fingerprint) {
      return new Response(
        JSON.stringify({ error: 'Missing fingerprint' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get download events for this fingerprint
    const { data: events } = await supabaseClient
      .from('analytics_events')
      .select('event_data')
      .eq('user_fingerprint', fingerprint)
      .eq('event_type', 'download_completed')

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