#!/usr/bin/env ts-node
import fg from 'fast-glob';
import fs from 'fs/promises';

async function main() {
  const files = await fg(['mobile/src/**/*.js', 'mobile/src/**/*.jsx', 'mobile/src/**/*.ts', 'mobile/src/**/*.tsx']);
  const offenders: string[] = [];
  for (const f of files) {
    const txt = await fs.readFile(f, 'utf8');
    if (txt.includes("import api from '../api/client'")) offenders.push(f);
  }
  if (offenders.length) {
    console.error('Found direct api client imports. Use sdk instead:\n' + offenders.join('\n'));
    process.exit(1);
  }
  console.log('OK: All API usages routed through sdk.');
}

main().catch((e) => { console.error(e); process.exit(1); }); 