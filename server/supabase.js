import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

// Check if credentials are appropriately configured
export function isSupabaseConfigured() {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseKey) &&
    !supabaseUrl.includes('your-project') &&
    !supabaseKey.includes('your-supabase-anon-key')
  );
}

// Initialize Supabase client
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Save Company & PDF Reports to Supabase database
export async function saveReportsToSupabase(scripCode, companyMeta, reports) {
  if (!supabase) {
    console.log('[Supabase] Credentials not configured in .env. Skipping cloud Supabase sync.');
    return { success: false, reason: 'Supabase credentials missing' };
  }

  try {
    const cleanScripCode = String(scripCode).trim();
    const cleanName = (companyMeta?.name || `Company ${cleanScripCode}`).substring(0, 255).trim();
    const cleanSymbol = (companyMeta?.symbol || '').substring(0, 50).trim();

    // 1. Upsert Company info
    const { error: companyError } = await supabase
      .from('companies')
      .upsert({
        scrip_code: cleanScripCode,
        name: cleanName,
        symbol: cleanSymbol,
        last_synced: new Date().toISOString()
      }, { onConflict: 'scrip_code' });

    if (companyError) {
      console.error('[Supabase] Company upsert error:', companyError);
      return { success: false, error: companyError };
    }

    // 2. Format annual report records
    const reportRows = reports.map(r => ({
      scrip_code: cleanScripCode,
      year: String(r.year || 'N/A').trim(),
      file_name: r.fileName || '',
      raw_date: r.rawDate || '',
      pdf_url: r.pdfUrl || '',
      direct_url: r.directUrl || ''
    }));

    // 3. Upsert Annual Reports rows
    const { data, error: reportsError } = await supabase
      .from('annual_reports')
      .upsert(reportRows, { onConflict: 'scrip_code,year,direct_url' });

    if (reportsError) {
      console.error('[Supabase] Reports upsert error:', reportsError);
      return { success: false, error: reportsError };
    }

    console.log(`[Supabase] Successfully saved ${reports.length} PDF links for scrip code ${scripCode} to Supabase!`);
    return { success: true, count: reports.length, data };
  } catch (err) {
    console.error('[Supabase] Unexpected error saving to Supabase:', err);
    return { success: false, error: err.message };
  }
}

// Fetch stored reports from Supabase database
export async function getReportsFromSupabase(scripCode) {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('annual_reports')
      .select('*')
      .eq('scrip_code', scripCode)
      .order('year', { ascending: false });

    if (error || !data || data.length === 0) {
      return null;
    }

    return data.map(r => ({
      year: r.year,
      fileName: r.file_name,
      rawDate: r.raw_date,
      pdfUrl: r.pdf_url,
      directUrl: r.direct_url
    }));
  } catch (err) {
    console.error('[Supabase] Fetch error:', err);
    return null;
  }
}
