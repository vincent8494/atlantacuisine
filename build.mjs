import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep editable filenames in dist. Publish only media used by the website.
const source = fileURLToPath(new URL('./dist/', import.meta.url));
const output = fileURLToPath(new URL('./public-build/', import.meta.url));
const versioned = new Map();
await mkdir(join(output, 'assets/v'), { recursive: true });

for (const file of ['index.html', 'style.css', 'app.js']) {
  const original = await readFile(join(source, file), 'utf8');
  const references = /assets\/[\w-]+\.(?:webp|woff2|mp4|webm|jpeg|avif)\b/g;
  for (const name of new Set(original.match(references))) {
    if (versioned.has(name)) continue;
    const media = await readFile(join(source, name));
    const hash = createHash('sha256').update(media).digest('hex').slice(0, 16);
    const { name: stem, ext } = parse(name);
    const destination = `assets/v/${stem}.${hash}${ext}`;
    await writeFile(join(output, destination), media);
    versioned.set(name, destination);
  }
  await writeFile(join(output, file), original.replace(references, name => versioned.get(name)));
}

// Preserve existing public photo links and ship the self-hosted font licenses.
const redirects = Array.from(versioned, ([from, to]) => `/${from} /${to} 302`);
await writeFile(join(output, '_redirects'), redirects.join('\n') + '\n');
for (const family of ['cormorant-garamond', 'geist', 'oswald']) {
  const license = `assets/${family}-license.txt`;
  await writeFile(join(output, license), await readFile(join(source, license)));
}

const published = new Set(versioned.values());
for (const name of await readdir(join(output, 'assets/v'))) {
  const path = 'assets/v/' + name;
  if (/^[\w-]+\.[a-f0-9]{16}\.\w+$/.test(name) && !published.has(path)) {
    await unlink(join(output, path));
  }
}
