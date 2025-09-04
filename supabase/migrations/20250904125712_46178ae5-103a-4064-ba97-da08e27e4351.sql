-- Add admin role for simon@exportvins.fr
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users 
WHERE email = 'simon@exportvins.fr'
ON CONFLICT (user_id, role) DO NOTHING;