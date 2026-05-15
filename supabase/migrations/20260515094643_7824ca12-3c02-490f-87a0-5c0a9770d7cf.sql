UPDATE public.profiles
SET subscription_plan = 'monthly',
    stripe_customer_id = 'cus_UVawwBDE6ChDqA',
    campaigns_remaining = GREATEST(campaigns_remaining, 1),
    updated_at = now()
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'marie.rouanet@saintcels.fr');