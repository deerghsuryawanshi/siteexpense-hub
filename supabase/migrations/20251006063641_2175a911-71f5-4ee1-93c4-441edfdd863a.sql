-- Create a trigger to automatically create profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert profiles for existing users who don't have profiles yet
INSERT INTO public.profiles (id, name, role, email)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'name', 'User'),
  COALESCE((u.raw_user_meta_data->>'role')::user_role, 'admin'),
  u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;