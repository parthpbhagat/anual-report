import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'database.json');

// Initialize database file if not present
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      companies: {},
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

// Read database contents
export function readDb() {
  try {
    initDb();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file:', err);
    return { companies: {}, createdAt: new Date().toISOString() };
  }
}

// Write database contents safely
export function writeDb(data) {
  try {
    initDb();
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

// Save company annual report PDF links to database
export function saveCompanyReports(scripCode, companyMeta, reports) {
  const db = readDb();
  const existing = db.companies[scripCode] || {};

  db.companies[scripCode] = {
    scripCode,
    name: companyMeta?.name || existing.name || `Company ${scripCode}`,
    symbol: companyMeta?.symbol || existing.symbol || '',
    isin: companyMeta?.isin || existing.isin || '',
    lastSynced: new Date().toISOString(),
    reportsCount: reports.length,
    reports: reports.map(r => ({
      year: r.year,
      fileName: r.fileName,
      rawDate: r.rawDate,
      pdfUrl: r.pdfUrl,
      directUrl: r.directUrl,
      savedAt: new Date().toISOString()
    }))
  };

  writeDb(db);
  return db.companies[scripCode];
}

// Get saved company reports from database
export function getCompanyReports(scripCode) {
  const db = readDb();
  return db.companies[scripCode] || null;
}

// Get all saved companies in database
export function getAllCompanies() {
  const db = readDb();
  return Object.values(db.companies).map(c => ({
    scripCode: c.scripCode,
    name: c.name,
    symbol: c.symbol,
    lastSynced: c.lastSynced,
    reportsCount: c.reportsCount || (c.reports ? c.reports.length : 0)
  }));
}

// Get overall database statistics
export function getDbStats() {
  const db = readDb();
  const companies = Object.values(db.companies);
  let totalPdfs = 0;
  companies.forEach(c => {
    totalPdfs += c.reports ? c.reports.length : 0;
  });

  return {
    totalCompanies: companies.length,
    totalPdfsSaved: totalPdfs,
    dbPath: DB_FILE,
    createdAt: db.createdAt
  };
}
