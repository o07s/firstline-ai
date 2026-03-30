import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cssnjdlniiqvnknogypi.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wPO12EtVXcqIU49EQSy4Kg_1SOpRyY0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
