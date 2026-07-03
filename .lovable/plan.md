## Plan: Update Owner Email in create-campaign Edge Function

### Scope
Update only the `buildOwnerEmailHtml` function inside `supabase/functions/create-campaign/index.ts`. No other files or logic are touched.

### Changes

1. **Copy update**
   - Replace the sentence: *"In the meantime, all replies land directly in your inbox — respond quickly to maximise conversion."* with:
     > "Qualified prospects and responses will appear directly in your WineExporters dashboard as soon as they are available."
   - Replace the French equivalent with:
     > "Les prospects qualifiés et les réponses apparaîtront directement dans votre tableau de bord WineExporters dès qu'ils seront disponibles."

2. **Design refresh**
   - Background color: `#faf6f0`
   - Text color: `#1a1a1a`
   - Accent/burgundy: `#59191F`
   - Update the dark-themed inline CSS (wrapper, card, divider, small text, logo) to a light palette matching the new colors.
   - Footer signature: change from **"WineExporters"** to **"WineExporters by ExportVins"**.

### Verification
- Deploy the updated Edge Function.
- Confirm the function still compiles and deploys successfully.