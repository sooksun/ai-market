'use client';

import { useEffect } from 'react';

export function PrintTrigger() {
  useEffect(() => {
    const btn = document.getElementById('print-button');
    if (!btn) return;
    const handler = () => window.print();
    btn.addEventListener('click', handler);
    return () => btn.removeEventListener('click', handler);
  }, []);
  return null;
}
