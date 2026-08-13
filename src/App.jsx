import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  ExternalLink,
  X,
  Building2,
  Sun,
  Moon
} from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const [selectedCompany, setSelectedCompany] = useState({
    name: 'TATA POWER COMPANY LTD',
    symbol: 'TATAPOWER',
    scripCode: '500400'
  });

  const [reports, setReports] = useState([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

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

  // Debounced stock search targeting BSE India quote search API
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

  // Load annual reports when selected company changes
  useEffect(() => {
    if (selectedCompany && selectedCompany.scripCode) {
      loadAnnualReports(selectedCompany.scripCode);
    }
  }, [selectedCompany]);

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

  const loadAnnualReports = async (scripCode) => {
    setIsLoadingReports(true);
    try {
      const res = await fetch(`/api/annual-reports/${scripCode}`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data : (data.reports || []));
    } catch (err) {
      console.error('Failed to load annual reports:', err);
      setReports([]);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleSelectCompany = (company) => {
    setSelectedCompany({
      name: company.name,
      symbol: company.symbol,
      scripCode: company.scripCode
    });
    setQuery('');
    setShowDropdown(false);
    setSelectedIndex(-1);
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

  return (
    <div className="app-container">
      {/* Top Navbar with Theme Toggle */}
      <nav className="top-navbar">
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
          Institutional-grade search for BSE listed companies with 30+ years of historical annual financial reports.
        </p>
      </header>

      {/* Search Input with Keyboard Navigation */}
      <div className="search-section" ref={searchRef}>
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by Company Name / Security Code / Symbol (e.g. Tata Power)..."
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

        {/* BSE India Style Autocomplete Dropdown */}
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
                  {/* Top Line: Company Name */}
                  <div
                    className="bse-company-name"
                    dangerouslySetInnerHTML={{ __html: item.rawNameHtml || item.name }}
                  />

                  {/* Sub Line: Symbol | ISIN | Security Code */}
                  <div className="bse-sub-details">
                    {item.symbol && (
                      <span className="bse-sub-pill">
                        <span>Symbol:</span> <strong>{item.symbol}</strong>
                      </span>
                    )}
                    {item.isin && (
                      <span className="bse-sub-pill">
                        <span>ISIN:</span> {item.isin}
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

        {/* Popular Presets */}
        <div className="preset-container">
          <span>Popular Searches:</span>
          <button
            className="preset-chip"
            onClick={() => handleSelectCompany({ name: 'TATA POWER COMPANY LTD', symbol: 'TATAPOWER', scripCode: '500400' })}
          >
            Tata Power (500400)
          </button>
          <button
            className="preset-chip"
            onClick={() => handleSelectCompany({ name: 'RELIANCE INDUSTRIES LTD', symbol: 'RELIANCE', scripCode: '500325' })}
          >
            Reliance (500325)
          </button>
          <button
            className="preset-chip"
            onClick={() => handleSelectCompany({ name: 'TATA CONSULTANCY SERVICES LTD', symbol: 'TCS', scripCode: '532540' })}
          >
            TCS (532540)
          </button>
        </div>
      </div>

      {/* Selected Company Header */}
      {selectedCompany && (
        <div className="selected-company-card">
          <div style={{ width: '100%' }}>
            <h2 className="company-header-title">{selectedCompany.name}</h2>
            <div className="company-meta-pills">
              <div className="meta-pill">
                <Building2 size={14} /> Security Code: <strong>{selectedCompany.scripCode}</strong>
              </div>
              {selectedCompany.symbol && (
                <div className="meta-pill">
                  Symbol: <strong>{selectedCompany.symbol}</strong>
                </div>
              )}
              <div className="meta-pill">
                Source: <strong>BSE India Financial Directory</strong>
              </div>
            </div>

            {/* Annual Report PDF Link Buttons under Company Name */}
            <div className="company-pdf-section">
              <div className="pdf-section-label">
                <FileText size={15} color="var(--accent-primary)" />
                <span>Company Annual Report PDFs ({reports.length}):</span>
              </div>
              {isLoadingReports ? (
                <div className="pdf-buttons-loading">
                  <div className="spinner-sm"></div> Fetching PDF links for {selectedCompany.name}...
                </div>
              ) : reports.length > 0 ? (
                <div className="pdf-buttons-list">
                  {reports.map((report, idx) => (
                    <a
                      key={idx}
                      href={report.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="company-pdf-btn"
                      title={`Click to open FY ${report.year} Annual Report PDF for ${selectedCompany.name}`}
                    >
                      <FileText size={14} />
                      <span>FY {report.year} PDF</span>
                      <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              ) : (
                <span className="no-pdf-text">No PDF files available for this company.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

