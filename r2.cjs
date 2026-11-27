#!/usr/bin/env node
// Puts the newest app update on Cloudflare R2 too (download.twocode.nl/app/), next to twocode.nl. Since beta 47 a
// Twenty-One that cannot reach twocode.nl (the hosting's firewall shows some PCs a check page) asks there instead
// (auto-update.cjs MIRROR). tools/publish.cjs calls this after publishing; on its own it sends the current version:
//
//   node tools/r2.cjs ["What is new"]
//
// Needs an R2 API token with "Object Read & Write" on the bucket, in %USERPROFILE%\.twocode\r2.json (never in the repo):
//   { "account": "<Cloudflare account id>", "bucket": "twocode-downloads", "accessKeyId": "…", "secretAccessKey": "…" }
// Uses R2's S3 API with a Signature Version 4 request (no extra packages).
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const repo = path.resolve(__dirname, '..');
const configFile = process.env.TWOCODE_R2 || path.join(os.homedir(), '.twocode', 'r2.json');
const MIRROR = 'https://download.twocode.nl/app/';

const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const hmac = (key, text) => crypto.createHmac('sha256', key).update(text).digest();

/** The Authorization header of an S3 request (Signature Version 4). headers: lower-case names, including host. */
function sign({ method, pathname, query = '', headers, payloadHash, region, service = 's3', accessKeyId, secretAccessKey, amzDate }) {
  const day = amzDate.slice(0, 8), names = Object.keys(headers).sort();
  const canonical = [method, pathname, query, names.map(n => n + ':' + String(headers[n]).trim()).join('\n') + '\n', names.join(';'), payloadHash].join('\n');
  const scope = `${day}/${region}/${service}/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha(canonical)].join('\n');
  const key = hmac(hmac(hmac(hmac('AWS4' + secretAccessKey, day), region), service), 'aws4_request');
  return `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${crypto.createHmac('sha256', key).update(toSign).digest('hex')}`;
}

function config() {
  try {
    const c = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    return c.account && c.bucket && c.accessKeyId && c.secretAccessKey ? c : null;
  } catch { return null; }
}

/** One file into the bucket. */
async function put(c, key, body, contentType, cacheControl) {
  const host = `${c.account}.r2.cloudflarestorage.com`, pathname = `/${c.bucket}/${key}`;
  const amzDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const headers = { host, 'content-type': contentType, 'cache-control': cacheControl, 'x-amz-content-sha256': sha(body), 'x-amz-date': amzDate };
  const authorization = sign({ method: 'PUT', pathname, headers, payloadHash: headers['x-amz-content-sha256'], region: 'auto', accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey, amzDate });
  const { host: _h, ...send } = headers;
  const res = await fetch(`https://${host}${pathname}`, { method: 'PUT', body, headers: { ...send, authorization } });
  if (!res.ok) throw new Error(`R2 answered ${res.status} for ${key}: ${(await res.text()).slice(0, 200)}`);
}

/** The update zip, then latest.json (in that order: latest.json never points at a file that is not there yet). */
async function publish(version, info, zip, notes = '') {
  const c = config();
  if (!c) { console.log('Not on Cloudflare yet: no R2 token in ' + configFile + ' (see tools/r2.cjs).'); return false; }
  const name = `Twenty-One-app-${version}.zip`;
  await put(c, 'app/' + name, zip, 'application/zip', 'public, max-age=31536000, immutable');
  const latest = { format: 'twocode-app-update/1', version, url: MIRROR + name, size: info.size, sha256: info.sha256, signature: info.signature,
    electron: info.electron || '', notes, published: new Date().toISOString(), download: 'https://twocode.nl/download/' };
  await put(c, 'app/latest.json', Buffer.from(JSON.stringify(latest)), 'application/json', 'no-cache, max-age=0');
  console.log(`Also on Cloudflare: ${MIRROR}latest.json → ${version}`);
  return true;
}

module.exports = { sign, publish, config };

if (require.main === module) {
  const version = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8')).version;
  const dist = n => path.join(repo, 'dist', n);
  const info = JSON.parse(fs.readFileSync(dist(`Twenty-One-app-${version}.json`), 'utf8'));
  const zip = fs.readFileSync(dist(`Twenty-One-app-${version}.zip`));
  if (info.version !== version || sha(zip) !== info.sha256) { console.error('dist/ does not belong to version ' + version); process.exit(1); }
  publish(version, info, zip, process.argv[2] || '').catch(e => { console.error('Not on Cloudflare: ' + e.message); process.exit(1); });
}
