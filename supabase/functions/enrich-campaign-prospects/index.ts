import {authorizeResults,serviceClient,internalJob,withResultOperation} from '../_shared/campaign-results-auth.ts';
import {findBuyerContact} from '../_shared/buyer-match.ts';
import {normalizeCountry} from '../_shared/country.ts';
import {createHandler} from '../_shared/campaign-enrichment-handler.mjs';
Deno.serve(createHandler({authorizeResults,serviceClient,internalJob,withResultOperation,findBuyerContact,normalizeCountry,env:Deno.env.get.bind(Deno.env)}));
