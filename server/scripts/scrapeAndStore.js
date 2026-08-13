import https from 'https';
import dotenv from 'dotenv';
import { saveCompanyReports, getDbStats } from '../db.js';
import { saveReportsToSupabase, isSupabaseConfigured } from '../supabase.js';

dotenv.config();

// Default seed list of top BSE companies
const SEED_COMPANIES = [
  { scripCode: '500400', name: 'TATA POWER COMPANY LTD', symbol: 'TATAPOWER' },
  { scripCode: '500325', name: 'RELIANCE INDUSTRIES LTD', symbol: 'RELIANCE' },
  { scripCode: '532540', name: 'TATA CONSULTANCY SERVICES LTD', symbol: 'TCS' },
  { scripCode: '500209', name: 'INFOSYS LTD', symbol: 'INFY' },
  { scripCode: '500180', name: 'HDFC BANK LTD', symbol: 'HDFCBANK' },
  { scripCode: '532174', name: 'ICICI BANK LTD', symbol: 'ICICIBANK' },
  { scripCode: '500112', name: 'STATE BANK OF INDIA', symbol: 'SBIN' },
  { scripCode: '500510', name: 'LARSEN & TOUBRO LTD', symbol: 'LT' },
  { scripCode: '507685', name: 'WIPRO LTD', symbol: 'WIPRO' },
  { scripCode: '500875', name: 'ITC LTD', symbol: 'ITC' },
  { scripCode: '500696', name: 'HINDUSTAN UNILEVER LTD', symbol: 'HINDUNILVR' },
  { scripCode: '532454', name: 'BHARTI AIRTEL LTD', symbol: 'BHARTIARTL' },
  { scripCode: '532500', name: 'MARUTI SUZUKI INDIA LTD', symbol: 'MARUTI' },
  { scripCode: '500247', name: 'KOTAK MAHINDRA BANK LTD', symbol: 'KOTAKBANK' },
  { scripCode: '532215', name: 'AXIS BANK LTD', symbol: 'AXISBANK' },
  { scripCode: '500034', name: 'BAJAJ FINANCE LTD', symbol: 'BAJFINANCE' },
  { scripCode: '500820', name: 'ASIAN PAINTS LTD', symbol: 'ASIANPAINT' },
  { scripCode: '500114', name: 'TITAN COMPANY LTD', symbol: 'TITAN' },
  { scripCode: '524715', name: 'SUN PHARMACEUTICAL INDUSTRIES', symbol: 'SUNPHARMA' },
  { scripCode: '532538', name: 'ULTRATECH CEMENT LTD', symbol: 'ULTRACEMCO' },
  { scripCode: '532281', name: 'HCL TECHNOLOGIES LTD', symbol: 'HCLTECH' },
  { scripCode: '532555', name: 'NTPC LTD', symbol: 'NTPC' },
  { scripCode: '532898', name: 'POWER GRID CORP OF INDIA', symbol: 'POWERGRID' },
  { scripCode: '500520', name: 'MAHINDRA & MAHINDRA LTD', symbol: 'M&M' },
  { scripCode: '500470', name: 'TATA STEEL LTD', symbol: 'TATASTEEL' },
  { scripCode: '500570', name: 'TATA MOTORS LTD', symbol: 'TATAMOTORS' },
  { scripCode: '532978', name: 'BAJAJ FINSERV LTD', symbol: 'BAJAJFINSV' },
  { scripCode: '500790', name: 'NESTLE INDIA LTD', symbol: 'NESTLEIND' },
  { scripCode: '532921', name: 'ADANI PORTS & SPECIAL ECON', symbol: 'ADANIPORTS' },
  { scripCode: '532755', name: 'TECH MAHINDRA LTD', symbol: 'TECHM' }
];

// Helper function to fetch URL with BSE headers
function fetchBse(url) {
  return new Promise((resolve, reject) => {
    const options = {
      insecureHTTPParser: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.bseindia.com/',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

// Parse BSE Autocomplete HTML Response to extract Scrip Code and Company Name
function parseBseSearchResults(html) {
  const results = [];
  const liRegex = /<li[^>]*><a id='([^']+)'[^>]*>([\s\S]*?)(?:<\/a>)?\s*<\/li>/gi;
  let match;

  while ((match = liRegex.exec(html)) !== null) {
    const linkPath = match[1];
    let innerHtml = match[2].replace(/<span class='offleft'[\s\S]*?<\/span>/gi, '');

    const nameMatch = innerHtml.match(/^(.*?)(?:<br\s*\/?>|<br>)/i);
    let rawName = nameMatch ? nameMatch[1].trim() : '';
    let cleanName = rawName.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();

    const spanMatch = innerHtml.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
    let cleanSpan = spanMatch ? spanMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim() : '';

    const scripCode = linkPath.match(/\b\d{6}\b/)?.[0] || cleanSpan.match(/\b\d{6}\b/)?.[0] || '';
    const symbol = cleanSpan.split(/\s+/)[0] || '';

    if (cleanName && scripCode) {
      results.push({ name: cleanName, scripCode, symbol });
    }
  }
  return results;
}

// Discover all companies dynamically from BSE India Search Directory
async function discoverAllBseCompanies() {
  console.log('🔍 Discovering all BSE Listed Companies from BSE India Directory...');
  const companyMap = new Map();

  // Add initial seed companies
  SEED_COMPANIES.forEach(c => companyMap.set(c.scripCode, c));

  // Search terms A-Z, 0-9, and common prefixes
  const searchTerms = [
    ...'abcdefghijklmnopqrstuvwxyz'.split(''),
    ...'0123456789'.split(''),
    'tata', 'reliance', 'bank', 'india', 'tech', 'pharma', 'steel', 'power', 'finance', 'industries', 'ltd', 'corp'
  ];

  for (const term of searchTerms) {
    try {
      const searchUrl = `https://api.bseindia.com/Msource/1D/getQouteSearch.aspx?Type=EQ&text=${encodeURIComponent(term)}&flag=site`;
      const res = await fetchBse(searchUrl);
      if (res.status === 200 && res.data) {
        const matches = parseBseSearchResults(res.data);
        matches.forEach(c => {
          if (!companyMap.has(c.scripCode)) {
            companyMap.set(c.scripCode, c);
          }
        });
      }
    } catch (err) {
      // Continue searching
    }
    await new Promise(r => setTimeout(r, 150));
  }

  const allDiscovered = Array.from(companyMap.values());
  console.log(`✅ Discovery Complete! Total Unique BSE Listed Companies Found: ${allDiscovered.length}\n`);
  return allDiscovered;
}

// Scrape Annual Reports for a single company
async function scrapeCompanyReports(scripCode) {
  let reports = [];

  // Tier 1: Query BSE histannreport API
  const histApiUrl = `https://api.bseindia.com/BseIndiaAPI/api/histannreport/w?scripcode=${scripCode}`;
  try {
    const histRes = await fetchBse(histApiUrl);
    if (histRes.status === 200 && histRes.data) {
      const parsedHist = JSON.parse(histRes.data);
      if (parsedHist.Table && Array.isArray(parsedHist.Table) && parsedHist.Table.length > 0) {
        reports = parsedHist.Table.map(item => {
          let directPdfUrl = item.PDFDownload || '';
          if (directPdfUrl && !directPdfUrl.startsWith('http')) {
            directPdfUrl = `https://www.bseindia.com/xml-data/corpfiling/AttachHis/${directPdfUrl}`;
          }

          const cleanFileName = directPdfUrl ? directPdfUrl.split('/').pop() : `Annual_Report_${item.Year}.pdf`;
          const proxyPdfUrl = `/api/proxy-pdf?url=${encodeURIComponent(directPdfUrl)}`;

          return {
            year: item.Year || 'N/A',
            fileName: cleanFileName,
            rawDate: item.Fld_AuthoriseDate || item.REV_DT || '',
            pdfUrl: proxyPdfUrl,
            directUrl: directPdfUrl
          };
        });
      }
    }
  } catch (err) {
    // Silently continue
  }

  // Tier 2: Fallback to AnnualReport API if 0 items found
  if (reports.length === 0) {
    const annualApiUrl = `https://api.bseindia.com/BseIndiaAPI/api/AnnualReport/w?scripcode=${scripCode}`;
    try {
      const annualRes = await fetchBse(annualApiUrl);
      if (annualRes.status === 200 && annualRes.data) {
        const parsedAnnual = JSON.parse(annualRes.data);
        const items = parsedAnnual.Table || [];

        for (const item of items) {
          let rawFile = (item.file_name || '').replace(/\\/g, '').trim();
          if (!rawFile) continue;

          let cleanFile = rawFile;
          if (cleanFile.endsWith('.pdf.pdf')) {
            cleanFile = cleanFile.substring(0, cleanFile.length - 4);
          } else if (!cleanFile.endsWith('.pdf')) {
            cleanFile = cleanFile + '.pdf';
          }

          const directPdfUrl = `https://www.bseindia.com/xml-data/corpfiling/AttachLive/${cleanFile}`;
          const proxyPdfUrl = `/api/proxy-pdf?url=${encodeURIComponent(directPdfUrl)}`;

          reports.push({
            year: item.year || 'N/A',
            fileName: cleanFile,
            rawDate: item.dt_tm || '',
            pdfUrl: proxyPdfUrl,
            directUrl: directPdfUrl
          });
        }
      }
    } catch (err) {
      // Silently continue
    }
  }

  return reports;
}

// Main Full-Scale Scraper Process
async function runFullScraper() {
  console.log('====================================================');
  console.log('🌐 Starting FULL BSE India Directory Auto-Scraper');
  console.log(`☁️ Supabase Cloud Configured: ${isSupabaseConfigured() ? 'YES ✅' : 'NO ❌'}`);
  console.log('====================================================\n');

  // Discover all BSE companies across directory
  const companiesList = await discoverAllBseCompanies();

  let totalScrapedPdfs = 0;
  let successCompaniesCount = 0;

  for (let i = 0; i < companiesList.length; i++) {
    const company = companiesList[i];
    console.log(`[${i + 1}/${companiesList.length}] Processing ${company.name} (Code: ${company.scripCode})...`);

    const reports = await scrapeCompanyReports(company.scripCode);

    if (reports.length > 0) {
      console.log(`   └─ Found ${reports.length} PDF report links.`);

      // 1. Save to Local JSON Database
      saveCompanyReports(company.scripCode, company, reports);

      // 2. Save to Supabase Cloud Database if configured
      if (isSupabaseConfigured()) {
        await saveReportsToSupabase(company.scripCode, company, reports);
      }

      totalScrapedPdfs += reports.length;
      successCompaniesCount++;
    } else {
      console.log(`   └─ No PDF filings found on BSE.`);
    }

    // Delay between requests
    await new Promise(res => setTimeout(res, 250));
  }

  const finalStats = getDbStats();

  console.log('\n====================================================');
  console.log('🎉 FULL BSE Directory Scraping & Population Completed!');
  console.log(`✅ Processed ${successCompaniesCount}/${companiesList.length} Companies with PDF Filings`);
  console.log(`📄 Total Historical Annual Report PDFs Stored: ${totalScrapedPdfs}`);
  console.log(`💾 Total Local Database Records: ${finalStats.totalCompanies} Companies, ${finalStats.totalPdfsSaved} PDFs`);
  console.log('====================================================');
}

runFullScraper().catch(err => {
  console.error('Full Scraper Error:', err);
});
