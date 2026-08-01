"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function CategoryMegaMenu({ categories = [] }) {
  const [open, setOpen] = useState(false);
  const [activeParent, setActiveParent] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (categories.length && activeParent === null) {
      setActiveParent(categories[0].id);
    }
  }, [categories, activeParent]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const active = categories.find((c) => c.id === activeParent);

  return (
    <div className="mega-menu-wrap" ref={wrapRef}>
      <button className="mega-menu-trigger" onClick={() => setOpen((o) => !o)}>
        <span className="mega-menu-icon">☰</span> Toutes les catégories
      </button>
      {open && (
        <div className="mega-menu-panel">
          <div className="mega-menu-list">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`mega-menu-item ${cat.id === activeParent ? "active" : ""}`}
                onMouseEnter={() => setActiveParent(cat.id)}
                onClick={() => setActiveParent(cat.id)}
              >
                <span>{cat.emoji} {cat.name}</span>
                <span className="mega-menu-arrow">›</span>
              </button>
            ))}
          </div>
          {active && (
            <div className="mega-menu-detail">
              <h3>{active.emoji} {active.name}</h3>
              <div className="mega-menu-columns">
                <Link
                  href={`/shop?category=${active.slug}`}
                  className="mega-menu-link mega-menu-link-all"
                  onClick={() => setOpen(false)}
                >
                  Voir tout « {active.name} »
                </Link>
                {active.children.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/shop?category=${sub.slug}`}
                    className="mega-menu-link"
                    onClick={() => setOpen(false)}
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
