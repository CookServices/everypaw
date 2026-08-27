import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const src = 'src/styles.css';
const dest = 'dist/styles.css';

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`copied ${src} -> ${dest}`);
