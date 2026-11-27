const eligibleProducts = new Set(["prod_Tz5poZVS69KDTi", "prod_UGecQn333xCJ73", "prod_TgeYMnIDcHFp54", "prod_TnlDl1u25NcthG"]);
export async function activeSubscription(account: { email: string; stripe_customer_id: string | null }, stripeKey: string, request: typeof fetch = fetch) {
  if (!stripeKey || !account.email) return false;
  const normalize = (s: string) => s.trim().toLowerCase();
  const get = async (path: string) => {
    const res = await request("https://api.stripe.com/v1/" + path, { headers: { Authorization: "Bearer " + stripeKey, "Stripe-Version": "2025-02-24.acacia" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw Error("Subscription verification unavailable");
    return await res.json();
  };
  let id = account.stripe_customer_id;
  if (!id) {
    const found = await get("customers?email=" + encodeURIComponent(account.email) + "&limit=100");
    if (!Array.isArray(found.data) || found.has_more) return false;
    const matches = found.data.filter((x: any) => !x.deleted && typeof x.email === "string" && normalize(x.email) === normalize(account.email));
    if (matches.length !== 1) return false;
    id = matches[0].id;
  }
  if (typeof id !== "string" || !/^cus_[A-Za-z0-9]+$/.test(id)) return false;
  const customer = await get("customers/" + id);
  if (customer.deleted || typeof customer.email !== "string" || normalize(customer.email) !== normalize(account.email)) return false;
  const list = await get("subscriptions?customer=" + encodeURIComponent(id) + "&status=active&limit=100");
  if (!Array.isArray(list.data) || list.has_more) return false;
  return list.data.some((s: any) => s.status === "active" && s.customer === id && !s.pause_collection
    && Array.isArray(s.items?.data) && !s.items.has_more && s.items.data.some((i: any) => eligibleProducts.has(i.price?.product)));
}
