// Spec v3 tests T-01 .. T-22 for the order brain. Run: node n8n/test/test_brain.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { brain, extract, loadCatalog, maskPhone } = require('../code/brain.js');

const csv = fs.readFileSync(path.join(__dirname, '..', 'catalog.csv'), 'utf8').trim().split('\n');
const hdr = csv[0].split(',');
const rows = csv.slice(1).map(l => Object.fromEntries(l.split(',').map((v, i) => [hdr[i], v])));
const cfg = { catalog_json: JSON.stringify(rows), delivery_fee_inr: 25, handling_fee_inr: 5, swap_window_s: 60 };
const T0 = new Date('2026-10-08T08:30:00+05:30');
const at = s => new Date(T0.getTime() + s * 1000);
const say = (store, text, now = T0) => brain({ chat_id: '1', text }, store, cfg, now);
const tap = (store, data, now = T0) => brain({ chat_id: '1', callback_data: data }, store, cfg, now);
const txt = r => r.messages.map(m => m.text).join('\n---\n');
let pass = 0;
const t = (id, fn) => { try { fn(); pass++; console.log('PASS', id); } catch (e) { console.log('FAIL', id, e.message); process.exitCode = 1; } };

t('T-01', () => { const e = extract('1 kg atta, 2 roti, 3 kg bhindi, kal', T0); assert.deepStrictEqual(e.items, [{ product: 'atta', qty: 1, unit: 'kg' }, { product: 'roti', qty: 2, unit: null }, { product: 'bhindi', qty: 3, unit: 'kg' }]); assert.strictEqual(e.date, '2026-10-09'); });
t('T-02', () => { const s = {}; const r = say(s, '2 roti'); assert.deepStrictEqual(s.sessions['1'].items[0].qty, 2); assert.strictEqual(s.sessions['1'].items[0].unit, 'pcs'); });
t('T-03', () => { const s = {}; const r = say(s, 'bhindi'); assert.strictEqual(s.sessions['1'].items[0].qty, null); assert.match(txt(r), /Bhindi kitna chahiye/); });
t('T-04', () => { const s = {}; const r = say(s, 'xyzabc'); assert.match(txt(r), /samajh nahi aaya/); assert.match(txt(r), /xyzabc/); });
t('T-05', () => { const s = {}; const r = say(s, '   '); assert.match(txt(r), /dobara/); });
t('T-06', () => { const c = loadCatalog(cfg); assert.ok(c.length > 0); for (const r of c) { assert.ok(!('in_stock_flag' in r)); assert.ok(!('stock' in r)); assert.ok(!('qty_in_stock' in r)); } assert.ok(!c.find(r => r.sku === 'BRD-002'), 'out of stock item hidden'); });

function fullOrder() {
  const s = {};
  say(s, '1 kg atta, 2 roti, 3 kg bhindi, kal');
  tap(s, 'slot:morning'); say(s, 'Ramesh'); say(s, '9812345610');
  const r = tap(s, 'area:Kankarbagh');
  return { s, r };
}
t('T-07', () => { const { s } = fullOrder(); const { price } = require('../code/brain.js'); assert.strictEqual(price(s.sessions['1'], cfg).total, 218); });
t('T-08', () => { const { r } = fullOrder(); const x = txt(r); for (const l of ['Items subtotal', 'Delivery fee (demo)', 'Handling fee (demo)', 'TOTAL', '₹218', 'demo']) assert.ok(x.includes(l), l); });
t('T-09', () => { const { r } = fullOrder(); const lines = txt(r).split('\n').filter(l => /₹/.test(l)); assert.strictEqual(lines.length, 3 + 4, 'exactly 3 item lines + 4 charge lines'); });
t('T-10', () => { const { r } = fullOrder(); assert.ok(txt(r).includes('98xxxxxx10')); assert.ok(!txt(r).includes('9812345610')); assert.strictEqual(maskPhone('98123 45610'), '98xxxxxx10'); });
t('T-11', () => { const s = {}; const r = say(s, '1 kg atta kal'); const k = r.messages[1].keyboard; assert.deepStrictEqual(k.rows[0].row.buttons.map(b => b.text), ['Morning', 'Evening']); });
t('T-12', () => { const { s } = fullOrder(); tap(s, 'confirm'); assert.strictEqual(s.sessions['1'].state, 'SWAP_WINDOW'); assert.strictEqual(s.orders.length, 1); assert.strictEqual(s.orders[0].order_id, 'ORD-20261008-0001'); });
t('T-13', () => { const { s } = fullOrder(); tap(s, 'confirm'); tap(s, 'confirm'); assert.strictEqual(s.orders.length, 1); });
t('T-14', () => { const { s } = fullOrder(); const r = say(s, 'haan'); assert.strictEqual(s.sessions['1'].state, 'SWAP_WINDOW'); assert.match(txt(r), /Order ID/); });
t('T-15', () => { const { s } = fullOrder(); tap(s, 'confirm'); const r = tap(s, 'swap', at(30)); assert.match(txt(r), /Kaunsa item/); });
t('T-16', () => { const { s } = fullOrder(); tap(s, 'confirm'); const r = tap(s, 'swap', at(61)); assert.match(txt(r), /time nikal gaya/); assert.strictEqual(s.sessions['1'].state, 'CLOSED'); });
t('T-17', () => { const { s } = fullOrder(); tap(s, 'confirm'); tap(s, 'swap', at(10)); const r1 = tap(s, 'swapitem:ATA-001', at(12)); assert.ok(r1.messages[0].keyboard.rows.length === 3); const r = tap(s, 'swapto:ATA-001:ATA-002', at(15)); const x = txt(r); assert.ok(x.includes('Aashirvaad 1 kg ₹48 → Pillsbury 1 kg ₹52 (+₹4)'), x); assert.ok(x.includes('TOTAL: ₹218 → ₹222'), x); });
t('T-18', () => { const { s } = fullOrder(); tap(s, 'confirm'); tap(s, 'swap', at(10)); tap(s, 'swapto:ATA-001:ATA-002', at(15)); tap(s, 'swapcancel', at(20)); assert.strictEqual(s.sessions['1'].items[0].sku, 'ATA-001'); assert.strictEqual(s.sessions['1'].change_log.length, 0); });
t('T-19', () => { const { s } = fullOrder(); tap(s, 'confirm'); tap(s, 'swap', at(10)); tap(s, 'swapto:ATA-001:ATA-002', at(15)); const r = tap(s, 'swapconfirm', at(20)); const ss = s.sessions['1']; assert.strictEqual(ss.change_log.length, 1); assert.strictEqual(ss.change_log[0].total_after, 222); assert.match(txt(r), /dispatch/); assert.match(txt(r), /₹222/); });
t('T-19b', () => { const { s } = fullOrder(); tap(s, 'confirm'); tap(s, 'swap', at(10)); tap(s, 'swapto:ATA-001:ATA-002', at(15)); const r = tap(s, 'swapconfirm', at(65)); assert.match(txt(r), /time nikal gaya/); assert.strictEqual(s.sessions['1'].items[0].sku, 'ATA-001'); });
t('T-20', () => { const { s } = fullOrder(); tap(s, 'confirm'); const r = say(s, 'mere order mein kitne items hain?', at(5)); assert.match(txt(r), /3 item/); assert.match(txt(r), /Atta 1 kg/); });
t('T-21', () => { const s = {}; const r = say(s, 'atta ke aur brands kaun se hain?'); const x = txt(r); assert.match(x, /Aashirvaad/); assert.match(x, /Pillsbury/); assert.ok(!/stock/i.test(x)); });
t('T-22', () => { const s = {}; const r = say(s, 'kitna bacha hai stock mein atta?'); assert.strictEqual(txt(r), 'Stock ki jaankari main nahi de sakta.'); });
t('X-hindi-nums', () => { const e = extract('do kilo aloo aur teen roti aadha kilo tamatar', T0); assert.deepStrictEqual(e.items.map(i => [i.product, i.qty, i.unit]), [['aloo', 2, 'kg'], ['roti', 3, null], ['tamatar', 0.5, 'kg']]); });
t('X-grams', () => { const e = extract('500 gram dahi aur 250g cheeni', T0); assert.deepStrictEqual(e.items.map(i => [i.product, i.qty, i.unit]), [['dahi', 0.5, 'kg'], ['cheeni', 0.25, 'kg']]); });
t('X-html-escape', () => { const s = {}; say(s, '1 kg atta kal'); tap(s, 'slot:morning'); say(s, '<b>Ramesh</b>'); say(s, '9812345610'); const r = tap(s, 'area:Kankarbagh'); assert.ok(txt(r).includes('&lt;b&gt;Ramesh&lt;/b&gt;')); });
t('X-sessions-isolated', () => { const s = {}; say(s, '1 kg atta'); brain({ chat_id: '2', text: '2 roti' }, s, cfg, T0); assert.strictEqual(s.sessions['1'].items[0].product, 'atta'); assert.strictEqual(s.sessions['2'].items[0].product, 'roti'); });
console.log(`\n${pass} passed, exit ${process.exitCode || 0}`);
