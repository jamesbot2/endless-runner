// ===== BUILD: game.js =====
// Concatenates all game modules in dependency order
const fs = require('fs');
const path = require('path');

const GAME_DIR = path.join(__dirname);
const FILES = [
  'constants.js',
  'state.js',
  'audio.js',
  'textures.js',
  'scene.js',
  'player.js',
  'track.js',
  'buildings.js',
  'obstacles.js',
  'coins.js',
  'particles.js',
  'collision.js',
  'ui.js',
  'controls.js',
  'homelander.js',
  'police.js',
  'pvp-client.js',
  'pvp-ui.js',
  'main.js',
  'account.js',
];

let output = '';
for (const file of FILES) {
  const filePath = path.join(GAME_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`Warning: ${file} not found, skipping`);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  output += `// ===== ${file} =====\n`;
  output += content;
  output += '\n';
}

fs.writeFileSync(path.join(GAME_DIR, '..', 'game.js'), output);
console.log(`Built game.js (${output.length} bytes, ${FILES.length} modules)`);
