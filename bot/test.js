const assert = require('assert');
const { parseMessage } = require('./parse');
const base = { id: '1', author: 'Max', createdAt: Date.UTC(2026, 10, 1), url: 'https://discord.com/x', embeds: [] };
let p = parseMessage({ ...base, content: '**NVE Preset 3** v1.2\nSehr realistisch', attachments: [
  { name: 'nve3.zip', url: 'https://cdn.discordapp.com/a/nve3.zip?ex=1', size: 5000 },
  { name: 'preview.png', url: 'https://cdn.discordapp.com/a/preview.png?ex=1', contentType: 'image/png' }] }, 'grafik', 'grafik-1');
assert.equal(p.name, 'NVE Preset 3 v1.2'); assert.equal(p.version, '1.2'); assert.ok(p.file && p.image); assert.equal(p.cat, 'grafik'); assert.equal(p.desc, 'Sehr realistisch');
p = parseMessage({ ...base, content: 'Minimap Rockstar Style\nhttps://www.mediafire.com/file/abc/map.zip/file.', attachments: [] }, 'minimap', 'm');
assert.equal(p.link, 'https://www.mediafire.com/file/abc/map.zip/file'); assert.equal(p.file, null);
assert.equal(parseMessage({ ...base, content: 'hallo zusammen', attachments: [] }, 'x', 'y'), null);
console.log('bot parse tests OK');
