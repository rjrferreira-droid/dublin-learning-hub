// Preparation-only correction before the pending SQL is applied or committed as a migration.
import fs from 'node:fs';const p='supabase/pending/lh_atomic_professor_start.sql';let s=fs.readFileSync(p,'utf8');
s=s.replace('month_start timestamptz:=','v_month_start timestamptz:=').replace('created_at>=month_start and created_at<month_start+','created_at>=v_month_start and created_at<v_month_start+');fs.writeFileSync(p,s);
