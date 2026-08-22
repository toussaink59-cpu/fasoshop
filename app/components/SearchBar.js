"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon, ClockIcon } from "@/app/components/Icons";

const HISTORY_KEY = "fasoshop-search-history";
const MAX_HISTORY = 5;

function getHistory() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function pushHistory(term) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const current = getHistory().filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
  const updated = [trimmed, ...current].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export default function SearchBar({ initialValue = "", autoFocus = false }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState([]);
  const [history, setHistory] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetch(`/api/products/suggestions?q=${encodeURIComponent(value.trim())}`)
        .then((r) => r.json())
        .then((data) => setSuggestions(data.suggestions || []))
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  function goToSearch(term) {
    const trimmed = term.trim();
    pushHistory(trimmed);
    setOpen(false);
    router.push(trimmed ? `/shop?q=${encodeURIComponent(trimmed)}` : "/shop");
  }

  const iconStyle = { display: "inline-flex", color: "var(--ink-400)", flexShrink: 0 };

  return (
    <div className="search-bar-wrap" ref={containerRef}>
      <form
        className="search-bar-standalone"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          goToSearch(value);
        }}
      >
        <span className="search-bar-icon" aria-hidden="true" style={iconStyle}>
          <SearchIcon size={16} />
        </span>
        <input
          type="search"
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher un produit, une boutique..."
          aria-label="Rechercher sur Kimoxa"
        />
      </form>

      {open && (value.trim() ? suggestions.length > 0 : history.length > 0) && (
        <div className="search-suggestions" role="listbox">
          {!value.trim() && history.length > 0 && (
            <>
              <div className="search-suggestions-label">Recherches récentes</div>
              {history.map((term) => (
                <button key={term} type="button" className="search-suggestion-item" onClick={() => goToSearch(term)}>
                  <span aria-hidden="true" style={iconStyle}><ClockIcon size={14} /></span> {term}
                </button>
              ))}
            </>
          )}
          {value.trim() && suggestions.map((p) => (
            <button
              key={p.id}
              type="button"
              className="search-suggestion-item"
              onClick={() => goToSearch(p.name)}
            >
              <span aria-hidden="true" style={iconStyle}><SearchIcon size={14} /></span> {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
