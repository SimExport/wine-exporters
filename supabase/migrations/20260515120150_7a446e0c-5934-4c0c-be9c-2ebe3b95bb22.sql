UPDATE public.profiles
SET subscription_plan = 'monthly',
    stripe_customer_id = 'cus_UW2g4Z9fLUdf9R',
    campaigns_remaining = GREATEST(COALESCE(campaigns_remaining,0), 1),
    updated_at = now()
WHERE user_id = 'dbe2aec5-fe39-4f1d-a62b-dae98ba1c6d6';

INSERT INTO public.user_roles (user_id, role)
VALUES ('dbe2aec5-fe39-4f1d-a62b-dae98ba1c6d6', 'paid')
ON CONFLICT (user_id, role) DO NOTHING;