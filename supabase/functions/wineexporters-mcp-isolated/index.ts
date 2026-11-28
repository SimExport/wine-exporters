import { createResourceHandler } from "../_shared/wine-mcp-isolated/resource-handler.ts";
import { database } from "../_shared/wine-mcp-isolated/isolated-runtime.ts";
import { activeSubscription } from "../_shared/wine-mcp-isolated/subscription.ts";
import {publicConfig,LINKING_RELEASE_APPROVED} from '../_shared/wine-mcp-isolated/public-config.ts';
import {publicFunctionRequest} from '../_shared/wine-mcp-isolated/edge-request.ts';
const config=publicConfig(key=>Deno.env.get(key));
const enabled = LINKING_RELEASE_APPROVED&&Deno.env.get("WINE_MCP_RESOURCE_ENABLED") === "true";
const handler=createResourceHandler({ ...config, enabled },
 enabled ? database("resource") : undefined, identity => activeSubscription(identity, Deno.env.get("STRIPE_SECRET_KEY") || ""));
Deno.serve(req=>handler(publicFunctionRequest(req,'wineexporters-mcp-isolated',config.resource)));
