import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  ExternalLink,
  X,
  Building2,
  Sun,
  Moon,
  Plus,
  LogOut,
  UserCheck
} from 'lucide-react';
import LoginPage from './components/LoginPage.jsx';
import { ENABLE_AUTH } from './config.js';

// Official BSE-style Red PDF Icon
function BsePdfIcon({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="bse-pdf-svg"
    >
      <path
        d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
        fill="rgba(220, 38, 38, 0.1)"
        stroke="#dc2626"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 2V8H20"
        stroke="#dc2626"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="12"
        y="17.2"
        fill="#dc2626"
        fontSize="6.5"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, sans-serif"
        textAnchor="middle"
        letterSpacing="0.03em"
      >
        PDF
      </text>
    </svg>
  );
}

const INITIAL_COMPANIES = [
  { name: 'TATA POWER COMPANY LTD', symbol: 'TATAPOWER', scripCode: '500400' },
  { name: 'RELIANCE INDUSTRIES LTD', symbol: 'RELIANCE', scripCode: '500325' },
  { name: 'TATA CONSULTANCY SERVICES LTD', symbol: 'TCS', scripCode: '532540' },
  { name: 'INFOSYS LTD', symbol: 'INFY', scripCode: '500209' },
  { name: 'HDFC BANK LTD', symbol: 'HDFCBANK', scripCode: '500180' },
  { name: 'ICICI BANK LTD', symbol: 'ICICIBANK', scripCode: '532174' },
  { name: 'STATE BANK OF INDIA', symbol: 'SBIN', scripCode: '500112' },
  { name: 'BHARTI AIRTEL LTD', symbol: 'BHARTIARTL', scripCode: '532454' },
  { name: 'LARSEN & TOUBRO LTD', symbol: 'LT', scripCode: '500510' },
  { name: 'HINDUSTAN UNILEVER LTD', symbol: 'HINDUNILVR', scripCode: '500696' }
];

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Authentication state (controlled via config.js ENABLE_AUTH toggle)
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (!ENABLE_AUTH) return true;
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('username') || '');

  // Companies matrix list with loaded annual report PDFs
  const [companies, setCompanies] = useState(
    INITIAL_COMPANIES.map(c => ({ ...c, reports: [], isLoading: true }))
  );

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Apply theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLoginSuccess = (username) => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('username', username);
    setIsAuthenticated(true);
    setCurrentUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setCurrentUser('');
  };

  // Load annual reports for initial companies on startup
  useEffect(() => {
    INITIAL_COMPANIES.forEach(comp => {
      fetchCompanyReports(comp.scripCode);
    });
  }, []);

  const fetchCompanyReports = async (scripCode) => {
    setCompanies(prev =>
      prev.map(c => c.scripCode === scripCode ? { ...c, isLoading: true } : c)
    );

    try {
      const res = await fetch(`/api/annual-reports/${scripCode}`);
      const data = await res.json();
      const reportList = Array.isArray(data) ? data : (data.reports || []);

      setCompanies(prev =>
        prev.map(c => c.scripCode === scripCode ? { ...c, reports: reportList, isLoading: false } : c)
      );
    } catch (err) {
      console.error(`Failed to load reports for ${scripCode}:`, err);
      setCompanies(prev =>
        prev.map(c => c.scripCode === scripCode ? { ...c, reports: [], isLoading: false } : c)
      );
    }
  };

  // Search autocomplete debounced
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSearchResults(data);
        setShowDropdown(true);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Failed to fetch search results:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCompany = (company) => {
    const existing = companies.find(c => c.scripCode === company.scripCode);
    if (!existing) {
      const newCompany = {
        name: company.name,
        symbol: company.symbol,
        scripCode: company.scripCode,
        reports: [],
        isLoading: true
      };
      setCompanies(prev => [newCompany, ...prev]);
      fetchCompanyReports(company.scripCode);
    } else {
      // Latest selected company moves to the top of the table
      setCompanies(prev => [existing, ...prev.filter(c => c.scripCode !== company.scripCode)]);
    }
    setQuery('');
    setShowDropdown(false);
    setSelectedIndex(-1);
  };

  const handleRemoveCompany = (scripCode) => {
    setCompanies(prev => prev.filter(c => c.scripCode !== scripCode));
  };

  // Keyboard navigation for BSE search suggestions
  const handleKeyDown = (e) => {
    if (!showDropdown || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => {
        const nextIdx = prev < searchResults.length - 1 ? prev + 1 : 0;
        scrollIntoView(nextIdx);
        return nextIdx;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => {
        const nextIdx = prev > 0 ? prev - 1 : searchResults.length - 1;
        scrollIntoView(nextIdx);
        return nextIdx;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        handleSelectCompany(searchResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const scrollIntoView = (idx) => {
    if (dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll('.autocomplete-item');
      if (items[idx]) {
        items[idx].scrollIntoView({ block: 'nearest' });
      }
    }
  };

  // Compute unique financial years across all listed companies (sorted descending)
  const allYears = Array.from(
    new Set(
      companies.flatMap(c => c.reports.map(r => r.year).filter(Boolean))
    )
  ).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
    return b.localeCompare(a);
  });

  // Display years (or default recent years while initial fetch finishes)
  const displayYears = allYears.length > 0
    ? allYears
    : ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];

  // If Auth is enabled and user is not logged in, render LoginPage
  if (ENABLE_AUTH && !isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        toggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Top Navbar with User Info & Theme Toggle */}
      <nav className="top-navbar" style={{ gap: '1rem', alignItems: 'center' }}>
        {ENABLE_AUTH && isAuthenticated && (
          <div className="user-status-pill">
            <UserCheck size={15} color="var(--accent-primary)" />
            <span>User: <strong>{currentUser || 'Admin'}</strong></span>
            <button className="logout-btn" onClick={handleLogout} title="Sign Out">
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        )}

        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={16} color="#38bdf8" /> Light Mode
            </>
          ) : (
            <>
              <Moon size={16} color="#2563eb" /> Dark Mode
            </>
          )}
        </button>
      </nav>

      {/* Header */}
      <header className="header">
        <h1 className="header-title">BSE Annual Report Finder</h1>
        <p className="header-subtitle">
          Institutional-grade search & comparison directory for BSE listed companies with 30+ years of annual financial reports.
        </p>
      </header>

      {/* Search Bar */}
      <div className="search-section" ref={searchRef}>
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            className="search-input"
            placeholder="Search & add company to table (e.g. Tata Power, Reliance, TCS)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.trim() && setShowDropdown(true)}
          />
          {query && (
            <button className="clear-btn" onClick={() => setQuery('')} title="Clear search">
              <X size={16} />
            </button>
          )}
        </div>

        {/* BSE Autocomplete Dropdown */}
        {showDropdown && (
          <div className="autocomplete-dropdown" ref={dropdownRef}>
            {isSearching ? (
              <div className="loading-box" style={{ padding: '1.5rem' }}>
                <div className="spinner" style={{ width: 24, height: 24 }}></div>
                <span>Searching BSE Directory...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item, idx) => (
                <div
                  key={idx}
                  className={`autocomplete-item ${idx === selectedIndex ? 'active' : ''}`}
                  onClick={() => handleSelectCompany(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div
                    className="bse-company-name"
                    dangerouslySetInnerHTML={{ __html: item.rawNameHtml || item.name }}
                  />
                  <div className="bse-sub-details">
                    {item.symbol && (
                      <span className="bse-sub-pill">
                        <span>Symbol:</span> <strong>{item.symbol}</strong>
                      </span>
                    )}
                    <span className="bse-sub-pill">
                      <span>Code:</span> <strong>{item.scripCode}</strong>
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-box" style={{ padding: '1.5rem' }}>
                No BSE matches found for "{query}"
              </div>
            )}
          </div>
        )}

      </div>

      {/* Handwritten Diagram Layout: Matrix Table */}
      <div className="matrix-card">
        <div className="matrix-header">
          <div className="matrix-title">
            <Building2 size={20} color="var(--accent-primary)" />
            <span>Company Financial Reports Directory</span>
          </div>
          <span className="reports-count">{companies.length} Companies Listed</span>
        </div>

        <div className="matrix-scroll-wrapper">
          <table className="matrix-table">
            <thead>
              <tr>
                <th className="sticky-col">Company Name</th>
                {displayYears.map(yr => (
                  <th key={yr} className="year-col-header">{yr}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.length > 0 ? (
                companies.map((comp) => (
                  <tr key={comp.scripCode}>
                    {/* First Sticky Column: Company Name */}
                    <td className="sticky-col company-cell">
                      <div className="company-cell-content">
                        <div>
                          <div className="company-name-text">{comp.name}</div>
                          <div className="company-code-sub">Code: {comp.scripCode} {comp.symbol ? `| ${comp.symbol}` : ''}</div>
                        </div>
                        <button
                          className="remove-comp-btn"
                          onClick={() => handleRemoveCompany(comp.scripCode)}
                          title="Remove company from table"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>

                    {/* Year Columns: PDF Buttons matching the user diagram */}
                    {displayYears.map(yr => {
                      const report = comp.reports.find(
                        r => String(r.year) === String(yr)
                      );

                      return (
                        <td key={yr} className="year-cell">
                          {comp.isLoading ? (
                            <div className="spinner-sm" style={{ margin: '0 auto' }}></div>
                          ) : report ? (
                            <a
                              href={report.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="matrix-pdf-icon-btn"
                              title={`Open FY ${report.year} Annual Report PDF for ${comp.name}`}
                            >
                              <BsePdfIcon size={24} />
                            </a>
                          ) : (
                            <span className="dash-text">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={displayYears.length + 1} className="empty-matrix-td">
                    <FileText size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p>No companies added yet. Search and add a company above!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
