import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rcedit } from 'rcedit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, '..');
const exePath = path.join(desktopRoot, 'release', 'win-unpacked', 'Endless Runner.exe');
const iconPath = path.join(desktopRoot, 'build', 'icon.ico');

if (!fs.existsSync(exePath)) {
  throw new Error(`Cannot set app icon; exe was not found: ${exePath}`);
}

if (!fs.existsSync(iconPath)) {
  throw new Error(`Cannot set app icon; icon was not found: ${iconPath}`);
}

await rcedit(exePath, { icon: iconPath });
console.log(`[desktop] Applied app icon to ${exePath}`);
