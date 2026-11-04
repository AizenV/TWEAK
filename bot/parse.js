// Wandelt eine Discord-Nachricht (schlankes Objekt) in einen Preset-Eintrag um.
const ARCHIVE = /\.(zip|rar|7z|rpf|asi|dll|ytd|oiv|awc)$/i;
const IMAGE = /\.(png|jpe?g|webp|gif)$/i;
const URL_RE = /https?:\/\/[^\s<>()\[\]"']+/gi;
const VERSION_RE = /\bv?(\d+(?:\.\d+){1,3})\b/i;

const clean = (s) => String(s || '')
  .replace(URL_RE, ' ')
  .replace(/<a?:\w+:\d+>|<[@#&!]+\d+>/g, ' ')   // Emojis / Mentions
  .replace(/[*_~`>|#]+/g, ' ')
  .replace(/\s+/g, ' ').trim();

function pickName(msg, fileName) {
  const lines = String(msg.content || '').split('\n').map(clean).filter(Boolean);
  if (lines.length) return lines[0].slice(0, 80);
  const emb = (msg.embeds || []).find((e) => e.title);
  if (emb) return clean(emb.title).slice(0, 80);
  if (fileName) return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 80);
  return null;
}

function parseMessage(msg, category, channelName) {
  const atts = msg.attachments || [];
  const file = atts.find((a) => ARCHIVE.test(a.name || ''));
  const img = atts.find((a) => IMAGE.test(a.name || '') || (a.contentType || '').startsWith('image/'));
  const embImg = (msg.embeds || []).map((e) => (e.image && e.image.url) || (e.thumbnail && e.thumbnail.url)).find(Boolean);
  const links = [...new Set(String(msg.content || '').match(URL_RE) || [])]
    .map((u) => u.replace(/[.,;!?]+$/, ''))
    .filter((u) => !/cdn\.discordapp\.com|media\.discordapp\.net/.test(u) || !IMAGE.test(u.split('?')[0]));
  const embLink = (msg.embeds || []).map((e) => e.url).find(Boolean);
  const link = links[0] || embLink || null;

  if (!file && !link) return null;                 // nichts Installierbares
  const name = pickName(msg, file && file.name);
  if (!name) return null;

  const text = `${msg.content || ''} ${file ? file.name : ''}`;
  const v = text.match(VERSION_RE);
  const lines = String(msg.content || '').split('\n').map(clean).filter(Boolean);
  return {
    id: msg.id,
    cat: category,
    name,
    version: v ? v[1] : '',
    desc: lines.slice(1).join(' ').slice(0, 200),
    image: img ? img.url : embImg || null,
    file: file ? { url: file.url, name: file.name, size: file.size || 0 } : null,
    link: file ? null : link,
    author: msg.author || '',
    channel: channelName || '',
    date: msg.createdAt ? new Date(msg.createdAt).toISOString() : '',
    msgUrl: msg.url || '',
  };
}

module.exports = { parseMessage, clean };
