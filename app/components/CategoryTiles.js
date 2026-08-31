"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CAT_IMAGES = [
  { match: "maison", img: "/categories/maison.jpg" },
  { match: "sant", img: "/categories/sante.jpg" },
  { match: "beaut", img: "/categories/sante.jpg" },
  { match: "sport", img: "/categories/sport.jpg" },
  { match: "loisir", img: "/categories/sport.jpg" },
  { match: "béb", img: "/categories/bebes.jpg" },
  { match: "jouet", img: "/categories/bebes.jpg" },
  { match: "super", img: "/categories/supermarche.jpg" },
  { match: "électron", img: "/categories/electronique.jpg" },
  { match: "téléphon", img: "/categories/telephones.jpg" },
  { match: "tablette", img: "/categories/telephones.jpg" },
  { match: "mode", img: "/categories/mode.jpg" },
  { match: "informatique", img: "/categories/informatique.jpg" },
];

function imgFor(name) {
  const n = (name || "").toLowerCase();
  const hit = CAT_IMAGES.find((c) => n.includes(c.match));
  return hit ? hit.img : "/categories/maison.jpg";
}

export default function CategoryTiles() {
  const [cats, setCats] = useState([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list = Array.isArray(d) ? d : (d && d.categories) || [];
        setCats(list.slice(0, 10));
      })
      .catch(() => {});
  }, []);

  if (cats.length === 0) return null;

  return (
    <div className="cat-tiles-wrap">
      <style>{`
        .cat-tiles-wrap { padding: 16px 16px 6px; }
        .cat-tiles { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; scrollbar-width: none; }
        .cat-tiles::-webkit-scrollbar { display: none; }
        .cat-tile { min-width: 112px; background: #fff; border: 1px solid var(--border, #e5e2d9); border-radius: 14px; overflow: hidden; text-decoration: none; transition: transform .15s ease, box-shadow .15s ease; }
        .cat-tile:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,.08); }
        .cat-tile img { width: 100%; height: 74px; object-fit: cover; display: block; }
        .cat-tile-label { display: block; padding: 8px 6px; font-size: .72rem; font-weight: 700; color: var(--ink-700, #444); text-align: center; line-height: 1.25; }
        @media (min-width: 768px) { .cat-tiles-wrap { padding: 20px 24px 8px; } .cat-tile { min-width: 128px; } .cat-tile img { height: 84px; } }
      `}</style>
      <div className="cat-tiles">
        {cats.map((c) => (
          <Link key={c.id} href={"/shop?category=" + (c.slug || c.id)} className="cat-tile">
            <img src={imgFor(c.name)} alt={c.name} loading="lazy" />
            <span className="cat-tile-label">{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
