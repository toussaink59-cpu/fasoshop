import fs from 'fs';
import path from 'path';
import { report } from '../lib.js';

function main() {
  console.log('\n=== 03 - cache privacy (is_favorited) ===');
  
  const routePath = path.join(process.cwd(), 'app/api/products/route.js');
  const code = fs.readFileSync(routePath, 'utf8');
  
  const hasUserIdCheck = code.includes('const cacheHeader = userId');
  const hasPrivateCache = code.includes('"private, no-store"') || code.includes("'private, no-store'");
  const hasPublicCache = code.includes('"public, s-maxage=') || code.includes("'public, s-maxage=");
  const hasConditional = code.includes('? "private') || code.includes("? 'private");
  
  const pass = hasUserIdCheck && hasPrivateCache && hasPublicCache && hasConditional;
  report('Logique cache conditionnelle', pass, 
    `userId check: ${hasUserIdCheck}, private: ${hasPrivateCache}, public: ${hasPublicCache}, ternary: ${hasConditional}`);
  
  process.exitCode = pass ? 0 : 1;
}

main();
