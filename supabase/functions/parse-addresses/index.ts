import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function parseAddress(raw: string): { street: string | null; city: string | null; postal_code: string | null; country: string | null } {
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean)

  if (parts.length === 0) return { street: null, city: null, postal_code: null, country: null }

  // Heuristic: last part = country, second-to-last = city (possibly with postal code), rest = street
  const country = parts.length >= 2 ? parts[parts.length - 1] : null
  let city: string | null = null
  let postal_code: string | null = null
  let street: string | null = null

  if (parts.length >= 2) {
    const cityPart = parts[parts.length - 2]
    // Try to extract postal code (sequence of digits, possibly with spaces)
    const postalMatch = cityPart.match(/^(\d[\d\s\-]{2,8}\d?)\s+(.+)$/)
    if (postalMatch) {
      postal_code = postalMatch[1].trim()
      city = postalMatch[2].trim()
    } else {
      // Try postal code after city name: "Paris 75000"
      const postalAfter = cityPart.match(/^(.+?)\s+(\d{4,6})$/)
      if (postalAfter) {
        city = postalAfter[1].trim()
        postal_code = postalAfter[2].trim()
      } else {
        city = cityPart
      }
    }
  }

  if (parts.length >= 3) {
    street = parts.slice(0, parts.length - 2).join(', ')
  } else if (parts.length === 1) {
    // Single part — treat as country
    return { street: null, city: null, postal_code: null, country: parts[0] }
  }

  return { street, city, postal_code, country }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Verify caller is admin
  const token = authHeader.replace('Bearer ', '')
  const { data: userData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .eq('role', 'admin')
    .maybeSingle()

  if (!roleData) {
    return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: corsHeaders })
  }

  // Fetch contacts with Address but no structured fields
  const { data: contacts, error: fetchError } = await supabase
    .from('buyer_contacts')
    .select('id, Address, street, city, postal_code, country')
    .not('Address', 'is', null)
    .or('street.is.null,street.eq.')
    .or('city.is.null,city.eq.')
    .limit(1000)

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500, headers: corsHeaders })
  }

  // Filter: only contacts where street AND city are empty but Address is filled
  const toParse = (contacts || []).filter(c =>
    c.Address && c.Address.trim() !== '' &&
    (!c.street || c.street.trim() === '') &&
    (!c.city || c.city.trim() === '')
  )

  let updated = 0
  const errors: string[] = []

  for (const contact of toParse) {
    const parsed = parseAddress(contact.Address!)
    // Only update if we extracted something useful
    if (!parsed.city && !parsed.country && !parsed.street) continue

    const updateData: Record<string, string | null> = {}
    if (parsed.street) updateData.street = parsed.street
    if (parsed.city) updateData.city = parsed.city
    if (parsed.postal_code) updateData.postal_code = parsed.postal_code
    // Don't overwrite country if already set
    if (parsed.country && (!contact.country || contact.country.trim() === '')) {
      updateData.country = parsed.country
    }

    if (Object.keys(updateData).length === 0) continue

    const { error: updateError } = await supabase
      .from('buyer_contacts')
      .update(updateData)
      .eq('id', contact.id)

    if (updateError) {
      errors.push(`${contact.id}: ${updateError.message}`)
    } else {
      updated++
    }
  }

  return new Response(JSON.stringify({
    total_candidates: toParse.length,
    updated,
    errors: errors.length > 0 ? errors : undefined,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
})
