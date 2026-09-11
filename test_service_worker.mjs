/**
 * Tests for sw.js, the service worker.
 *
 *   node test_service_worker.mjs
 *
 * Runs the worker in a sandbox with stubbed Cache / fetch APIs. The precache
 * list is checked against the files actually on disk, because cache.addAll is
 * atomic: one missing file and the install rejects, the worker is discarded,
 * and the app silently loses offline support.
 */
import fs from 'fs'; import vm from 'vm'; import { fileURLToPath } from 'url'; import path from 'path';
let failed = 0;
const ok = (n,c,d='') => { if(c) console.log(`  ok    ${n}${d?'  '+d:''}`); else { failed++; console.log(`  FAIL  ${n}${d?'  '+d:''}`); } };

function makeEnv({ netFails = false, netHangs = false, netStatus = 200, netSlowMs = 0,
                   netType = 'basic', existingCaches = {} } = {}) {
  const store = {};                                    // cacheName -> Map(url -> body)
  for (const [k,v] of Object.entries(existingCaches)) store[k] = new Map(Object.entries(v));
  const key = r => (typeof r === 'string' ? r : r.url).replace('https://app.test','');
  class Response {
    constructor(body, init={}) { this.body=body; this.status=init.status??200; this.statusText=init.statusText||'';
      this.type=init.type||'basic'; this.headers=init.headers||new Map();
      this.ok = this.status >= 200 && this.status < 300; }
    clone(){ return new Response(this.body,{status:this.status,type:this.type}); }
  }
  const caches = {
    open: async (name) => { store[name] ||= new Map(); const m = store[name];
      return { addAll: async (urls) => { for (const u of urls) { if (!FILES.has(u)) throw new TypeError(`Request failed: ${u}`); m.set(u, 'body:'+u); } },
               put: async (req, res) => { m.set(key(req), res.body); },
               keys: async () => [...m.keys()] }; },
    match: async (req) => { const k = key(req);
      for (const m of Object.values(store)) if (m.has(k)) return new Response(m.get(k));
      return undefined; },
    keys: async () => Object.keys(store),
    delete: async (n) => { delete store[n]; return true; }
  };
  const listeners = {};
  const self = {
    addEventListener: (t,f) => { listeners[t] = f; },
    location: { origin: 'https://app.test' },
    skipWaiting: async () => { self._skipWaiting = true; },
    clients: { claim: async () => { self._claimed = true; } },
  };
  const fetchImpl = async () => {
    if (netHangs) return new Promise(() => {});
    if (netFails) throw new TypeError('Failed to fetch');
    if (netSlowMs) await new Promise(r => setTimeout(r, netSlowMs));
    return new Response('FROM_NETWORK', { status: netStatus, type: netType });
  };
  const ctx = vm.createContext({ self, caches, fetch: fetchImpl, Response,
    Headers: class Headers { constructor(o={}){ Object.assign(this,o); } }, URL, console: { log(){} }, setTimeout, clearTimeout, Promise, Error, TypeError });
  ctx.globalThis = ctx;
  vm.runInContext(fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8'), ctx);
  return { self, caches, store, listeners, Response, key };
}

// the real precache list must match real files on disk
const DIR = path.dirname(fileURLToPath(import.meta.url));
const FILES = new Set(fs.readdirSync(DIR).map(f=>'/'+f).concat(['/']));

console.log('install');
{
  const { listeners, store, self } = makeEnv();
  let p; await listeners.install({ waitUntil: (x)=>{p=x;} });
  let threw = null; try { await p; } catch(e){ threw = e.message; }
  ok('install resolves (precache list all exist)', threw===null, threw||'');
  const names = Object.keys(store);
  ok('precached under the new cache name', names.length===1 && names[0].endsWith('-v16'), names.join(','));
  ok('all 19 entries cached', store[names[0]]?.size===19, `${store[names[0]]?.size} entries`);
  ok('skipWaiting called', self._skipWaiting===true);
}

console.log('\nfetch: online');
{
  const { listeners, store, key } = makeEnv();
  let p; listeners.fetch({ request:{method:'GET', url:'https://app.test/measurements.js', mode:'no-cors'}, respondWith:(x)=>{p=x;} });
  const res = await p;
  ok('returns the network copy, not a stale cache', res.body==='FROM_NETWORK', res.body);
  await new Promise(r=>setTimeout(r,10));
  ok('writes it through to the cache', Object.values(store)[0]?.get('/measurements.js')==='FROM_NETWORK');
}

console.log('\nfetch: offline');
{
  const { listeners } = makeEnv({ netFails:true,
    existingCaches:{ 'drill-hole-orientation-calculator-v16': { '/measurements.js':'CACHED' } } });
  let p; listeners.fetch({ request:{method:'GET', url:'https://app.test/measurements.js', mode:'no-cors'}, respondWith:(x)=>{p=x;} });
  ok('falls back to the cached copy', (await p).body==='CACHED');
}
{
  const { listeners } = makeEnv({ netFails:true,
    existingCaches:{ 'drill-hole-orientation-calculator-v16': { '/index.html':'SHELL' } } });
  let p; listeners.fetch({ request:{method:'GET', url:'https://app.test/deep/link', mode:'navigate'}, respondWith:(x)=>{p=x;} });
  ok('navigation falls back to the app shell', (await p).body==='SHELL');
}
{
  const { listeners } = makeEnv({ netFails:true });
  let p; listeners.fetch({ request:{method:'GET', url:'https://app.test/nope.js', mode:'no-cors'}, respondWith:(x)=>{p=x;} });
  ok('uncached miss offline returns 503, does not throw', (await p).status===503);
}

console.log('\nfetch: slow network (the drill-site case)');
{
  const { listeners } = makeEnv({ netHangs:true,
    existingCaches:{ 'drill-hole-orientation-calculator-v16': { '/main.js':'CACHED' } } });
  let p; listeners.fetch({ request:{method:'GET', url:'https://app.test/main.js', mode:'no-cors'}, respondWith:(x)=>{p=x;} });
  const t0 = Date.now(); const res = await p; const dt = Date.now()-t0;
  ok('times out and serves the cache instead of hanging', res.body==='CACHED' && dt<4000, `${dt}ms`);
}

console.log('\nfetch: passthrough');
{
  const { listeners } = makeEnv();
  let called = false;
  listeners.fetch({ request:{method:'POST', url:'https://app.test/x', mode:'no-cors'}, respondWith:()=>{called=true;} });
  ok('POST is left to the browser', called===false);
  called = false;
  listeners.fetch({ request:{method:'GET', url:'https://cdnjs.cloudflare.com/a.css', mode:'no-cors'}, respondWith:()=>{called=true;} });
  ok('cross-origin CDN is handled (so the icon font works offline)', called===true);
}

console.log('');
console.log('HTTP errors (a half finished deploy)');
{
  const { listeners } = makeEnv({ netStatus:503,
    existingCaches:{ 'drill-hole-orientation-calculator-v16': { '/measurements.js':'CACHED' } } });
  let p; listeners.fetch({ request:{method:'GET', url:'https://app.test/measurements.js', mode:'no-cors'}, respondWith:(x)=>{p=x;} });
  ok('a 503 falls back to the cache instead of blanking the app', (await p).body==='CACHED');
}
{
  const { listeners } = makeEnv({ netStatus:503 });
  let p; listeners.fetch({ request:{method:'GET', url:'https://app.test/x.js', mode:'no-cors'}, respondWith:(x)=>{p=x;} });
  ok('a 503 with nothing cached is passed through', (await p).status===503);
}
{
  const { listeners, store } = makeEnv({ netStatus:500 });
  let p; listeners.fetch({ request:{method:'GET', url:'https://app.test/x.js', mode:'no-cors'}, respondWith:(x)=>{p=x;} });
  await p; await new Promise(r=>setTimeout(r,10));
  ok('an error response is never written to the cache', (Object.values(store)[0]?.size||0)===0);
}

console.log('');
console.log('slow network still refreshes the cache');
{
  const { listeners, store } = makeEnv({ netSlowMs:3200,
    existingCaches:{ 'drill-hole-orientation-calculator-v16': { '/main.js':'OLD' } } });
  let p; listeners.fetch({ request:{method:'GET', url:'https://app.test/main.js', mode:'no-cors'}, respondWith:(x)=>{p=x;} });
  ok('serves the cached copy rather than waiting', (await p).body==='OLD');
  await new Promise(r=>setTimeout(r,800));
  ok('the late response is still cached, so the next launch is fresh',
     Object.values(store)[0]?.get('/main.js')==='FROM_NETWORK');
}

console.log('');
console.log('cross-origin icon font');
{
  const { listeners, store } = makeEnv({ netType:'opaque', netStatus:0 });
  let p; listeners.fetch({ request:{method:'GET', url:'https://cdnjs.cloudflare.com/a.css', mode:'no-cors'}, respondWith:(x)=>{p=x;} });
  await p; await new Promise(r=>setTimeout(r,10));
  ok('an opaque CDN response is cached', Object.values(store)[0]?.size===1);
}
{
  const { listeners } = makeEnv({ netFails:true,
    existingCaches:{ 'drill-hole-orientation-calculator-v16': { 'https://cdnjs.cloudflare.com/a.css':'FA' } } });
  let p; listeners.fetch({ request:{method:'GET', url:'https://cdnjs.cloudflare.com/a.css', mode:'no-cors'}, respondWith:(x)=>{p=x;} });
  ok('offline, the icon font comes from the cache', (await p).body==='FA');
}

console.log('\nactivate');
{
  const { listeners, store, self } = makeEnv({ existingCaches:{
    'drill-hole-orientation-calculator-v1': { '/old.js':'OLD' },
    'drill-hole-orientation-calculator-v16': { '/index.html':'NEW' } } });
  let p; listeners.activate({ waitUntil:(x)=>{p=x;} }); await p;
  ok('old cache deleted', !('drill-hole-orientation-calculator-v1' in store), Object.keys(store).join(','));
  ok('current cache kept', 'drill-hole-orientation-calculator-v16' in store);
  ok('clients.claim called', self._claimed===true);
}

console.log('\nmessage');
{
  const { listeners, self } = makeEnv();
  let threw=null; try { listeners.message({ data:null }); } catch(e){ threw=e.message; }
  ok('null message data does not throw', threw===null, threw||'');
  listeners.message({ data:{action:'skipWaiting'} });
  ok('skipWaiting message honoured', self._skipWaiting===true);
}

console.log(failed===0 ? '\nall passed' : `\n${failed} failed`);
process.exit(failed?1:0);
