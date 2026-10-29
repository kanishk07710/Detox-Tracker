'use client';

/** A ticking clock for the landing page's focus tile. Purely decorative. */
import { useEffect, useState } from 'react';

export default function FocusTile() {
  const [s, setS] = useState(25 * 60 + 12);
  useEffect(() => {
    const t = setInterval(() => setS((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const p = (n: number) => String(n).padStart(2, '0');
  return <div className="tile-clock" aria-hidden="true">{p(Math.floor(s / 3600))}:{p(Math.floor((s % 3600) / 60))}:{p(s % 60)}</div>;
}
