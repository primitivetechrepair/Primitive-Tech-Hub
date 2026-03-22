import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://gorjynnsbmdifnkzxame.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_qgugSD6chzZ-niM2gHd1bw_FTuR3iHB";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);