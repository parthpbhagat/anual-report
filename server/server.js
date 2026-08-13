import express from 'express';
import cors from 'cors';
import https from 'https';
import dotenv from 'dotenv';
import { saveCompanyReports, getCompanyReports, getAllCompanies, getDbStats } from './db.js';
import { saveReportsToSupabase, getReportsFromSupabase, isSupabaseConfigured } from './supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Helper function to fetch URL with BSE headers and insecure HTTP parser
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
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });
}

// Robust BSE HTML Search Parser
function parseBseSearchResults(html) {
  const results = [];
  const liRegex = /<li[^>]*><a id='([^']+)'[^>]*>([\s\S]*?)(?:<\/a>)?\s*<\/li>/gi;
  let match;

  while ((match = liRegex.exec(html)) !== null) {
    const linkPath = match[1];
    let innerHtml = match[2];

    innerHtml = innerHtml.replace(/<span class='offleft'[\s\S]*?<\/span>/gi, '');

    const nameMatch = innerHtml.match(/^(.*?)(?:<br\s*\/?>|<br>)/i);
    let rawNameHtml = nameMatch ? nameMatch[1].trim() : '';
    let cleanName = rawNameHtml.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();

    const spanMatch = innerHtml.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
    let rawSpanHtml = spanMatch ? spanMatch[1].trim() : '';
    let cleanSpan = rawSpanHtml.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim();

    // Extract 6-digit scrip code accurately
    const codeInPath = linkPath.match(/\b\d{6}\b/)?.[0];
    const codeInSpan = cleanSpan.match(/\b\d{6}\b/)?.[0];
    const scripCode = codeInPath || codeInSpan || '';

    const spanParts = cleanSpan.split(/\s+/).filter(Boolean);
    const symbol = spanParts[0] || '';
    const isin = spanParts.find(p => /^INE[A-Z0-9]{9}$/i.test(p)) || '';

    if (cleanName && scripCode) {
      results.push({
        name: cleanName,
        symbol,
        isin,
        scripCode,
        linkPath,
        rawNameHtml,
        rawSpanHtml,
        spanText: cleanSpan
      });
    }
  }
  return results;
}

// 1. Search Stock API
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.trim() === '') {
      return res.json([]);
    }

    const searchUrl = `https://api.bseindia.com/Msource/1D/getQouteSearch.aspx?Type=EQ&text=${encodeURIComponent(q.trim())}&flag=site`;
    const response = await fetchBse(searchUrl);

    if (response.status !== 200 || !response.data) {
      return res.json([]);
    }

    const results = parseBseSearchResults(response.data);
    res.json(results);
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({ error: 'Failed to search BSE stocks' });
  }
});

// Helper to check if a BSE PDF URL returns 200 OK
async function verifyPdfUrl(url) {
  try {
    const res = await fetchBse(url);
    const contentType = res.headers['content-type'] || '';
    return res.status === 200 && contentType.includes('pdf');
  } catch {
    return false;
  }
}

// 2. Fetch Annual Reports for a Scrip Code (Multi-tier: histannreport + AnnualReport fallback)
app.get('/api/annual-reports/:scripCode', async (req, res) => {
  try {
    const { scripCode } = req.params;
    const { companyName, symbol } = req.query;

    if (!scripCode || !/^\d+$/.test(scripCode)) {
      return res.status(400).json({ error: 'Invalid Scrip Code' });
    }

    let reports = [];

    // Tier 1: Query BSE histannreport/w (Primary historical endpoint with up to 30 years + direct PDF links)
    const histApiUrl = `https://api.bseindia.com/BseIndiaAPI/api/histannreport/w?scripcode=${scripCode}`;
    const histRes = await fetchBse(histApiUrl);

    if (histRes.status === 200 && histRes.data) {
      try {
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
      } catch (err) {
        console.error('histannreport parse error:', err);
      }
    }

    // Tier 2: Fallback to AnnualReport/w if histannreport returned 0 items
    if (reports.length === 0) {
      const annualApiUrl = `https://api.bseindia.com/BseIndiaAPI/api/AnnualReport/w?scripcode=${scripCode}`;
      const annualRes = await fetchBse(annualApiUrl);

      if (annualRes.status === 200 && annualRes.data) {
        try {
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

            let directPdfUrl = '';
            const baseName = cleanFile.replace(/\.pdf$/, '');
            const isGuid = /[a-fA-F-]/.test(baseName);

            if (isGuid) {
              const liveUrl = `https://www.bseindia.com/xml-data/corpfiling/AttachLive/${cleanFile}`;
              const hisUrl = `https://www.bseindia.com/xml-data/corpfiling/AttachHis/${cleanFile}`;

              if (await verifyPdfUrl(liveUrl)) {
                directPdfUrl = liveUrl;
              } else if (await verifyPdfUrl(hisUrl)) {
                directPdfUrl = hisUrl;
              } else {
                directPdfUrl = liveUrl;
              }
            } else {
              directPdfUrl = `https://www.bseindia.com/bseplus/annualreport/${scripCode}/${cleanFile}`;
            }

            const proxyPdfUrl = `/api/proxy-pdf?url=${encodeURIComponent(directPdfUrl)}`;

            reports.push({
              year: item.year || 'N/A',
              fileName: cleanFile,
              rawDate: item.dt_tm || '',
              pdfUrl: proxyPdfUrl,
              directUrl: directPdfUrl
            });
          }
        } catch (err) {
          console.error('AnnualReport parse error:', err);
        }
      }
    }

    // Save to local DB and async save to Supabase
    if (reports.length > 0) {
      const companyMeta = { name: companyName || `Company ${scripCode}`, symbol: symbol || '' };
      saveCompanyReports(scripCode, companyMeta, reports);
      saveReportsToSupabase(scripCode, companyMeta, reports).catch(err => {
        console.error('[Supabase] Async save error:', err);
      });
    }

    res.json(reports);
  } catch (error) {
    console.error('Annual reports API error:', error);
    res.status(500).json({ error: 'Failed to fetch annual reports' });
  }
});

// Endpoint to check Supabase configuration status
app.get('/api/supabase/status', (req, res) => {
  res.json({
    configured: isSupabaseConfigured(),
    message: isSupabaseConfigured()
      ? 'Supabase client is configured and ready'
      : 'Supabase credentials missing in .env file'
  });
});

// 3. Proxy PDF to bypass CORS and BSE User-Agent restrictions
app.get('/api/proxy-pdf', (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.startsWith('https://www.bseindia.com/')) {
    return res.status(400).send('Invalid or unauthorized PDF URL');
  }

  const options = {
    insecureHTTPParser: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/pdf,*/*',
      'Referer': 'https://www.bseindia.com/'
    }
  };

  https.get(targetUrl, options, (bseRes) => {
    if (bseRes.statusCode !== 200) {
      return res.status(bseRes.statusCode).send('Failed to load PDF from BSE');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
    if (bseRes.headers['content-length']) {
      res.setHeader('Content-Length', bseRes.headers['content-length']);
    }

    bseRes.pipe(res);
  }).on('error', (err) => {
    console.error('PDF Proxy error:', err);
    res.status(500).send('Error streaming PDF');
  });
});

app.listen(PORT, () => {
  console.log(`BSE Proxy Backend Server running on http://localhost:${PORT}`);
});
