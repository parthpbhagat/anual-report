import dotenv from 'dotenv';
import { getDbStats, getAllCompanies } from '../db.js';
import { supabase, isSupabaseConfigured } from '../supabase.js';

dotenv.config();

async function checkDatabaseStats() {
  console.log('====================================================');
  console.log('📊 BSE India Database Status & Inspection Report');
  console.log('====================================================\n');

  // 1. Local Database Status
  const localStats = getDbStats();
  const localCompanies = getAllCompanies();

  console.log('💾 [LOCAL DATABASE - server/database.json]');
  console.log(`   ├─ Total Companies Saved: ${localStats.totalCompanies}`);
  console.log(`   ├─ Total Annual Report PDFs Stored: ${localStats.totalPdfsSaved}`);
  console.log(`   └─ Database Path: ${localStats.dbPath}\n`);

  if (localCompanies.length > 0) {
    console.log('   📋 Sample Stored Companies in Local DB:');
    localCompanies.slice(0, 10).forEach((c, idx) => {
      console.log(`      ${idx + 1}. ${c.name} (${c.scripCode}) - ${c.reportsCount} PDFs`);
    });
    if (localCompanies.length > 10) {
      console.log(`      ... and ${localCompanies.length - 10} more companies.`);
    }
  }

  console.log('\n----------------------------------------------------');

  // 2. Supabase Cloud Database Status
  console.log('☁️ [SUPABASE CLOUD DATABASE]');
  console.log(`   ├─ Supabase URL: ${process.env.SUPABASE_URL || 'Not set'}`);
  console.log(`   └─ Supabase Client Configured: ${isSupabaseConfigured() ? 'YES ✅' : 'NO ❌'}\n`);

  if (isSupabaseConfigured() && supabase) {
    try {
      // Query companies table
      const { count: companiesCount, error: compErr } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      // Query annual_reports table
      const { count: reportsCount, error: repErr } = await supabase
        .from('annual_reports')
        .select('*', { count: 'exact', head: true });

      if (compErr || repErr) {
        console.log(`   ⚠️ Supabase Query Status: Tables 'companies' / 'annual_reports' not created yet in Supabase.`);
        console.log(`   💡 Action Needed: Please run SQL schema in Supabase SQL Editor.`);
      } else {
        console.log(`   ✅ Supabase Cloud Status: ONLINE & READY!`);
        console.log(`   ├─ Supabase Total Companies: ${companiesCount || 0}`);
        console.log(`   └─ Supabase Total Saved PDF Links: ${reportsCount || 0}\n`);

        // Fetch sample companies from Supabase
        const { data: sampleSupabaseComp } = await supabase
          .from('companies')
          .select('scrip_code, name, symbol, last_synced')
          .limit(10);

        if (sampleSupabaseComp && sampleSupabaseComp.length > 0) {
          console.log(`   📋 Sample Companies Stored in Supabase Cloud:`);
          sampleSupabaseComp.forEach((c, idx) => {
            console.log(`      ${idx + 1}. ${c.name} (Code: ${c.scrip_code}) ${c.symbol ? `| ${c.symbol}` : ''}`);
          });
        }
      }
    } catch (err) {
      console.log(`   ⚠️ Supabase Error: ${err.message}`);
    }
  }

  console.log('\n====================================================\n');
}

checkDatabaseStats().catch(err => console.error('Check Error:', err));
