import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vtigfkixmnlomdvhdrlg.supabase.co' // Reemplaza con tu URL real de Supabase
const supabaseAnonKey = 'sb_publishable_IZhSu8sLZeloqeb1Apc61g_-D1BFMyV'       // Reemplaza con tu Key real de Supabase

export const supabase = createClient(supabaseUrl, supabaseAnonKey)