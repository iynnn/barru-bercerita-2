import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, CheckSquare, Square } from 'lucide-react';

export default function SearchableMultiSelect({ 
  options, 
  selectedValues, 
  onChange,
  placeholder = '-- Tambah pembanding --',
  labelSelected = 'Indikator Terpilih'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    (opt.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggle = (optionId) => {
    const optStr = optionId.toString();
    const isSelected = selectedValues.includes(optStr);
    if (isSelected) {
      onChange(selectedValues.filter(val => val !== optStr));
    } else {
      onChange([...selectedValues, optStr]);
    }
  };

  const handleSelectAll = () => {
    const newValues = [...selectedValues];
    filteredOptions.forEach(opt => {
      const optStr = opt.id.toString();
      if (!newValues.includes(optStr)) {
        newValues.push(optStr);
      }
    });
    onChange(newValues);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="searchable-select-container" ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="glass-select"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
          cursor: 'pointer',
          width: '100%',
          padding: '0.75rem 1rem'
        }}
      >
        <span style={{ fontSize: '0.8rem', color: selectedValues.length ? 'var(--text-main)' : 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {selectedValues.length === 0 
            ? placeholder 
            : `${selectedValues.length} ${labelSelected}`}
        </span>
        <ChevronDown size={14} style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem', flexShrink: 0 }} />
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div
          className="glass-card searchable-select-dropdown"
          style={{
            position: 'absolute',
            top: '105%',
            left: 0,
            zIndex: 9999, // Super high z-index to stay on top
            padding: '0.85rem',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(0, 0, 0, 0.12)',
            borderRadius: '16px',
            maxHeight: '300px',
            width: '130%', // Render wider than filter cell
            minWidth: '320px', // Prevent narrow squeezed lists
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Cari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input"
              style={{
                fontSize: '0.75rem',
                padding: '0.4rem 0.5rem 0.4rem 2rem',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.02)'
              }}
              autoFocus
            />
          </div>

          {/* Action Helper Links */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 4px', borderBottom: '1px solid rgba(0,0,0,0.05)', pb: '4px' }}>
            <button
              type="button"
              onClick={handleSelectAll}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-dark)',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '4px',
                transition: 'background 0.2s'
              }}
              className="action-btn-hover"
            >
              ✓ Pilih Semua ({filteredOptions.length})
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--danger-light, #e53e3e)',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '2px 4px',
                borderRadius: '4px',
                transition: 'background 0.2s'
              }}
              className="action-btn-hover"
            >
              ✗ Kosongkan
            </button>
          </div>

          {/* Scrollable Options List */}
          <div
            style={{
              overflowY: 'auto',
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              paddingRight: '2px'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '1rem 0.5rem', textAlign: 'center' }}>
                Tidak ada indikator cocok.
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(opt.id.toString());
                return (
                  <div
                    key={opt.id}
                    onClick={() => handleToggle(opt.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start', // Align items to top for clean multi-line display
                      gap: '0.75rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      background: isChecked ? 'rgba(0, 122, 255, 0.06)' : 'transparent',
                      color: isChecked ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: isChecked ? 700 : 500,
                      transition: 'all 0.15s ease'
                    }}
                    className="select-option-row"
                  >
                    <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center' }}>
                      {isChecked ? (
                        <CheckSquare size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                      ) : (
                        <Square size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                      )}
                    </div>
                    <span style={{ flexGrow: 1, display: 'inline-block', lineHeight: 1.4 }}>
                      {opt.name} {opt.unit && `(${opt.unit})`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Styled Option hover overrides */}
      <style dangerouslySetInnerHTML={{__html: `
        .select-option-row:hover {
          background: rgba(0, 0, 0, 0.03) !important;
        }
        .action-btn-hover:hover {
          background: rgba(0, 0, 0, 0.04) !important;
          opacity: 0.8;
        }
      `}} />
    </div>
  );
}
