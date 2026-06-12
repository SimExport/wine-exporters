import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const GLOSSARY = `
Wine styles: White=Blanc, Red=Rouge, Rosé=Rosé, Sparkling=Effervescent, Sweet=Doux, Fortified=Muté, Dessert=Liquoreux, Orange=Orange, Natural=Nature, Organic=Bio, Biodynamic=Biodynamie.
Volumes (keep numerals, French uses thin spaces): "Less than 600 bottles"=>"Moins de 600 bouteilles"; "600 – 1,800 bottles"=>"600 – 1 800 bouteilles"; "1,800 – 10,000 bottles"=>"1 800 – 10 000 bouteilles"; "More than 10,000 bottles"=>"Plus de 10 000 bouteilles".
Origins / regions: France=France, Italy=Italie, Spain=Espagne, Portugal=Portugal, Germany=Allemagne, Austria=Autriche, Greece=Grèce, Hungary=Hongrie, Other Europe=Autre Europe, New World=Nouveau Monde, South America=Amérique du Sud, North America=Amérique du Nord, South Africa=Afrique du Sud, Argentina=Argentine, Chile=Chili, Australia=Australie, New Zealand=Nouvelle-Zélande, United States=États-Unis, Sweden=Suède.
Keep brand names and appellations untranslated (Bordeaux, Champagne, Rioja, etc.).
`.trim();

const SYSTEM = `You translate short wine-industry form values between English and French.
You always return STRICT JSON only, matching the requested shape, with no commentary.
Use this glossary for cohérence:
${GLOSSARY}
The source values come from a Tally form (likely English) or a PDF tender (English). For each field provide:
- "en": a lightly normalized English version (trim, consistent casing, fix obvious typos). If the source is already French, translate to English.
- "fr": a clean French translation respecting the glossary, French typography (espaces fines insécables for thousands, °), and natural phrasing.
If a field is empty or null, return an empty string for both.`;

interface Entry { id?: string; fields: Record<string, string | null | undefined> }

async function translateBatch(entries: Entry[]) {
  if (!ANTHROPIC_API_KEY) {
    // Fallback: pass-through
    return entries.map(e => ({
      id: e.id,
      translations: Object.fromEntries(
        Object.entries(e.fields).map(([k, v]) => [k, { fr: v ?? '', en: v ?? '' }])
      ),
    }));
  }

  const userPayload = entries.map((e, idx) => ({ idx, id: e.id, fields: e.fields }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Translate the fields of each entry. Return strict JSON of shape:
{"results":[{"idx":<int>,"translations":{"<fieldKey>":{"fr":"...","en":"..."}}}]}

Input:
${JSON.stringify(userPayload)}`,
      }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Anthropic error', res.status, text);
    throw new Error(`Anthropic ${res.status}`);
  }

  const data = await res.json();
  const textOut: string = (data.content?.[0]?.text ?? '').trim();
  const jsonStr = textOut.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(jsonStr);

  return parsed.results.map((r: any) => ({
    id: entries[r.idx]?.id,
    translations: r.translations,
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const entries: Entry[] = Array.isArray(body?.entries) ? body.entries : [];
    if (entries.length === 0) {
      return new Response(JSON.stringify({ results: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const BATCH = 10;
    const results: any[] = [];
    for (let i = 0; i < entries.length; i += BATCH) {
      const slice = entries.slice(i, i + BATCH);
      try {
        const r = await translateBatch(slice);
        results.push(...r);
      } catch (e) {
        console.error('Batch failed, falling back', e);
        results.push(...slice.map(en => ({
          id: en.id,
          translations: Object.fromEntries(
            Object.entries(en.fields).map(([k, v]) => [k, { fr: v ?? '', en: v ?? '' }])
          ),
        })));
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});