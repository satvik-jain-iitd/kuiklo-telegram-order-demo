// Kuiklo order brain. Pure logic, no n8n objects. Runs inside an n8n Code node
// (assemble.js wraps it) and inside node tests.
//
// brain(update, store, cfg, now) -> { messages: [{chat_id, text, keyboard}], session }
//   update: { chat_id, text, callback_data, from_name, llm_items? }
//   store:  object that persists between runs (workflow static data). store.sessions[chat_id]
//   cfg:    Config node values (fees, catalog_json, swap_window_s)
//   now:    Date (injected so tests can move the clock)

const NUM_WORDS = { ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, che: 6, saat: 7, aath: 8, nau: 9, das: 10,
  aadha: 0.5, adha: 0.5, half: 0.5, dedh: 1.5, dhai: 2.5, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, ten: 10 };
const UNITS = { kg: 'kg', kilo: 'kg', kilogram: 'kg', kilos: 'kg', g: 'g', gm: 'g', gram: 'g', grams: 'g',
  pcs: 'pcs', pc: 'pcs', piece: 'pcs', pieces: 'pcs', packet: 'pcs', packets: 'pcs', pack: 'pcs', litre: 'pcs', liter: 'pcs', ltr: 'pcs', l: 'pcs', dozen: 'dozen' };
const ALIASES = { atta: ['atta', 'aata', 'flour'], roti: ['roti', 'rotiyan', 'rotiya', 'chapati', 'chapatis', 'rotis'], bhindi: ['bhindi', 'okra'],
  aloo: ['aloo', 'alu', 'potato', 'potatoes'], pyaaz: ['pyaaz', 'pyaz', 'onion', 'onions'], tamatar: ['tamatar', 'tomato', 'tomatoes'],
  doodh: ['doodh', 'dudh', 'milk'], dahi: ['dahi', 'curd'], chawal: ['chawal', 'chaval', 'rice'], dal: ['dal', 'daal'],
  cheeni: ['cheeni', 'chini', 'sugar', 'shakkar'], tel: ['tel', 'oil'], namak: ['namak', 'salt'], ande: ['ande', 'anda', 'egg', 'eggs'],
  bread: ['bread', 'doubleroti', 'double_roti'],
  'moong dal': ['moong_dal', 'moong', 'mung'], 'chana dal': ['chana_dal'], 'masoor dal': ['masoor_dal', 'masoor'], suji: ['suji', 'sooji', 'rava', 'semolina'],
  besan: ['besan'], poha: ['poha', 'chura', 'chuda'], ghee: ['ghee'], paneer: ['paneer'], makhan: ['makhan', 'butter'], chai: ['chai', 'tea', 'chaipatti', 'chai_patti'],
  biscuit: ['biscuit', 'biscuits', 'biskut', 'parle', 'parleg', 'parle_g'], maggi: ['maggi', 'noodles'], namkeen: ['namkeen', 'bhujia'], sabun: ['sabun', 'soap'],
  surf: ['surf', 'detergent', 'washing_powder'], gobhi: ['gobhi', 'gobi', 'cauliflower', 'phool_gobhi'], palak: ['palak', 'spinach'], dhaniya: ['dhaniya', 'dhania', 'coriander'],
  mirch: ['mirch', 'mirchi', 'hari_mirch', 'chilli', 'chillies'], adrak: ['adrak', 'ginger'], lehsun: ['lehsun', 'lahsun', 'lasun', 'garlic'], nimbu: ['nimbu', 'lemon', 'neembu'],
  kheera: ['kheera', 'khira', 'cucumber'], lauki: ['lauki', 'louki', 'ghiya', 'bottle_gourd'], 'shimla mirch': ['shimla_mirch', 'capsicum'], kela: ['kela', 'kele', 'banana', 'bananas'],
  seb: ['seb', 'apple', 'apples'], aam: ['aam', 'mango', 'mangoes'], papita: ['papita', 'papaya'],
  'urad dal': ['urad_dal', 'urad'], rajma: ['rajma', 'kidney_beans'], chole: ['chole', 'chhole', 'kabuli_chana', 'chana'], sattu: ['sattu'], maida: ['maida'], 'soya chunks': ['soya_chunks', 'soya', 'nutrela'],
  daliya: ['daliya', 'dalia'], haldi: ['haldi', 'turmeric'], 'mirch powder': ['mirch_powder', 'lal_mirch', 'chilli_powder'], 'dhaniya powder': ['dhaniya_powder', 'dhania_powder'], 'garam masala': ['garam_masala'],
  jeera: ['jeera', 'cumin', 'zeera'], sarson: ['sarson', 'rai'], 'panch phoran': ['panch_phoran', 'panchphoran'], 'chaat masala': ['chaat_masala', 'chat_masala'], amchur: ['amchur', 'amchoor'],
  cheese: ['cheese'], lassi: ['lassi'], rusk: ['rusk', 'toast'], coffee: ['coffee', 'nescafe', 'bru'], 'cold drink': ['cold_drink', 'colddrink', 'coke', 'pepsi', 'thumsup', 'thums_up', 'sprite', 'coca_cola'],
  juice: ['juice'], pani: ['pani', 'water', 'bisleri', 'paani'], horlicks: ['horlicks'], bournvita: ['bournvita'], chips: ['chips', 'lays', 'kurkure', 'bingo'], chocolate: ['chocolate', 'dairy_milk', 'kitkat', 'chaklet'],
  pasta: ['pasta', 'pazzta'], ketchup: ['ketchup', 'sauce'], jam: ['jam'], achar: ['achar', 'pickle', 'aachar'], shahad: ['shahad', 'honey', 'shehad'], papad: ['papad'], sewai: ['sewai', 'seviyan', 'vermicelli'],
  kaju: ['kaju', 'cashew'], badam: ['badam', 'almond', 'almonds'], kishmish: ['kishmish', 'raisin', 'raisins'], makhana: ['makhana', 'makhane'], dishwash: ['dishwash', 'vim'], harpic: ['harpic', 'toilet_cleaner'],
  phenyl: ['phenyl', 'lizol', 'floor_cleaner'], machis: ['machis', 'matchbox', 'maachis'], agarbatti: ['agarbatti', 'incense'], 'mosquito coil': ['mosquito_coil', 'coil', 'goodknight', 'good_knight'],
  toothpaste: ['toothpaste', 'colgate', 'manjan'], toothbrush: ['toothbrush', 'brush'], shampoo: ['shampoo'], 'hair oil': ['hair_oil', 'parachute'], 'sanitary pad': ['sanitary_pad', 'pads', 'whisper', 'stayfree'],
  diaper: ['diaper', 'diapers', 'pampers', 'mamypoko'], baingan: ['baingan', 'brinjal', 'bhanta'], karela: ['karela'], matar: ['matar', 'peas'], gajar: ['gajar', 'carrot'], beans: ['beans', 'sem'],
  'patta gobhi': ['patta_gobhi', 'cabbage', 'bandh_gobhi'], mooli: ['mooli', 'radish'], kaddu: ['kaddu', 'pumpkin', 'kohda'], parwal: ['parwal', 'parval'], nenua: ['nenua', 'turai', 'tori'], shakarkand: ['shakarkand', 'sweet_potato'],
  methi: ['methi'], pudina: ['pudina', 'mint'], santra: ['santra', 'orange', 'narangi'], anar: ['anar', 'pomegranate'], angoor: ['angoor', 'grapes'], amrood: ['amrood', 'guava'], tarbooz: ['tarbooz', 'watermelon'],
  nashpati: ['nashpati', 'pear'], litchi: ['litchi', 'lichi'] };
// two-word product names are joined before tokenizing so they match one alias
const BIGRAMS = [['moong dal', 'moong_dal'], ['mung dal', 'moong_dal'], ['chana dal', 'chana_dal'], ['masoor dal', 'masoor_dal'], ['arhar dal', 'dal'], ['toor dal', 'dal'], ['tur dal', 'dal'],
  ['shimla mirch', 'shimla_mirch'], ['hari mirch', 'hari_mirch'], ['phool gobhi', 'phool_gobhi'], ['double roti', 'double_roti'], ['chai patti', 'chai_patti'], ['parle g', 'parle_g'], ['washing powder', 'washing_powder'], ['bottle gourd', 'bottle_gourd'],
  ['urad dal', 'urad_dal'], ['kabuli chana', 'kabuli_chana'], ['soya chunks', 'soya_chunks'], ['lal mirch', 'lal_mirch'], ['mirch powder', 'mirch_powder'], ['chilli powder', 'chilli_powder'], ['dhaniya powder', 'dhaniya_powder'], ['dhania powder', 'dhania_powder'],
  ['garam masala', 'garam_masala'], ['panch phoran', 'panch_phoran'], ['chaat masala', 'chaat_masala'], ['chat masala', 'chat_masala'], ['cold drink', 'cold_drink'], ['thums up', 'thums_up'], ['coca cola', 'coca_cola'], ['dairy milk', 'dairy_milk'],
  ['toilet cleaner', 'toilet_cleaner'], ['floor cleaner', 'floor_cleaner'], ['mosquito coil', 'mosquito_coil'], ['good knight', 'good_knight'], ['hair oil', 'hair_oil'], ['sanitary pad', 'sanitary_pad'], ['sanitary pads', 'sanitary_pad'],
  ['patta gobhi', 'patta_gobhi'], ['bandh gobhi', 'bandh_gobhi'], ['sweet potato', 'sweet_potato'], ['kidney beans', 'kidney_beans']];
const STOP = new Set(['aur', 'and', 'ka', 'ki', 'ke', 'ko', 'se', 'mein', 'me', 'chahiye', 'chaiye', 'bhej', 'do', 'dena', 'order', 'please', 'plz',
  'mujhe', 'muje', 'hai', 'ho', 'kar', 'karo', 'dijiye', 'le', 'lo', 'ek', 'bhi', 'sath', 'saath', 'wala', 'wali', 'the', 'a', 'of', 'with', 'for', 'ja', 'jao',
  'kal', 'aaj', 'parso', 'subah', 'morning', 'shaam', 'sham', 'evening', 'delivery', 'deliver', 'ghar', 'par', 'pe', 'kilo', 'kg', 'gram', 'g', 'pcs', 'piece', 'pieces', 'packet', 'pack', 'litre', 'liter', 'l', 'ltr', 'dozen', 'hona', 'chahie', 'den', 'dedo', 'bhejo', 'hello', 'hi', 'namaste']);

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function pad(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }
function lpad(s, n) { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; }
function money(n) { return '₹' + (Math.round(n * 100) / 100).toString(); }
function tokens(text) { let t = String(text || '').toLowerCase(); for (const [a, b] of BIGRAMS) t = t.split(a).join(b); return t.replace(/[,.!?;:()]/g, ' ').replace(/(\d)(kg|g|gm|l|ltr|pcs)\b/g, '$1 $2').split(/\s+/).filter(Boolean); }
function productOf(tok) { for (const p in ALIASES) if (ALIASES[p].includes(tok)) return p; return null; }
function numOf(tok) { if (/^\d+(\.\d+)?$/.test(tok)) return parseFloat(tok); return NUM_WORDS[tok] ?? null; }
function fmtDate(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; }
function hinDate(iso, now) { const t = fmtDate(now), k = fmtDate(addDays(now, 1)); const [, m, d] = iso.split('-'); const dd = `${+d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1]}`; return iso === t ? `aaj (${dd})` : iso === k ? `kal (${dd})` : dd; }

// ---- catalog (allowlisted columns only, never stock quantities) ----
function loadCatalog(cfg) {
  const rows = JSON.parse(cfg.catalog_json);
  const ALLOW = ['sku', 'product', 'brand', 'variant', 'unit', 'unit_price_inr', 'category', 'in_stock_flag'];
  return rows.map(r => { const o = {}; for (const k of ALLOW) if (k in r) o[k] = r[k]; return o; })
    .filter(r => String(r.in_stock_flag) !== '0').map(r => { const { in_stock_flag, ...o } = r; o.unit_price_inr = +o.unit_price_inr; return o; });
}
function defaultSku(catalog, product) { return catalog.find(r => r.product === product); }
function brandsFor(catalog, product) { return catalog.filter(r => r.product === product); }

// ---- extraction (rules) ----
function extract(text, now) {
  const toks = tokens(text);
  const items = [], unknown = [];
  let date = null, slot = null;
  toks.forEach((t, i) => {
    if (t === 'kal') date = fmtDate(addDays(now, 1)); else if (t === 'aaj') date = fmtDate(now); else if (t === 'parso') date = fmtDate(addDays(now, 2));
    if (['subah', 'morning'].includes(t)) slot = 'morning'; if (['shaam', 'sham', 'evening', 'raat'].includes(t)) slot = 'evening';
  });
  const used = new Set();
  toks.forEach((t, i) => {
    const p = productOf(t); if (!p) return;
    let qty = null, unit = null;
    // number before (within 2 tokens) or after (within 2 tokens); unit next to the number
    for (const j of [i - 1, i - 2, i + 1, i + 2]) {
      if (j < 0 || j >= toks.length || used.has(j)) continue;
      const n = numOf(toks[j]); if (n === null) continue;
      qty = n; used.add(j);
      for (const k of [j + 1, j - 1]) { if (k >= 0 && k < toks.length && k !== i && UNITS[toks[k]]) { unit = UNITS[toks[k]]; used.add(k); break; } }
      break;
    }
    if (unit === 'g' && qty !== null) { qty = qty / 1000; unit = 'kg'; }
    if (unit === 'dozen' && qty !== null) { qty = qty * 12; unit = 'pcs'; }
    items.push({ product: p, qty, unit });
    used.add(i);
  });
  toks.forEach((t, i) => { if (!used.has(i) && !STOP.has(t) && numOf(t) === null && !UNITS[t] && !productOf(t) && t.length > 2) unknown.push(t); });
  return { items, unknown_terms: unknown, date, slot };
}

// ---- pricing ----
function price(session, cfg) {
  const subtotal = session.items.reduce((s, it) => s + it.line_total, 0);
  const delivery_fee = +cfg.delivery_fee_inr, handling_fee = +cfg.handling_fee_inr;
  return { items_subtotal: subtotal, delivery_fee, handling_fee, total: subtotal + delivery_fee + handling_fee };
}
function lineFor(catRow, qty) { return { sku: catRow.sku, product: catRow.product, brand: catRow.brand, variant: catRow.variant, qty, unit: catRow.unit, unit_price: catRow.unit_price_inr, line_total: Math.round(qty * catRow.unit_price_inr * 100) / 100 }; }

// ---- rendering ----
function itemLine(it) { return `• ${cap(it.product)} ${it.qty} ${it.unit}`; }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function summary(session, cfg, now) {
  const ch = price(session, cfg);
  const rows = session.items.map(it => pad(`${cap(it.product)} (${it.brand})`, 22) + pad(`${it.qty} ${it.unit}`, 8) + lpad(money(it.line_total), 7));
  const t = [
    '🧾 <b>Order Summary</b>', '', '<pre>', pad('Item', 22) + pad('Qty', 8) + lpad('Price', 7), ...rows, '-'.repeat(37),
    pad('Items subtotal', 30) + lpad(money(ch.items_subtotal), 7), pad('Delivery fee (demo)', 30) + lpad(money(ch.delivery_fee), 7),
    pad('Handling fee (demo)', 30) + lpad(money(ch.handling_fee), 7), '-'.repeat(37), pad('TOTAL', 30) + lpad(money(ch.total), 7), '</pre>', '',
    `📦 Delivery: ${hinDate(session.delivery.date, now)}, ${session.delivery.slot} slot`, '💳 Payment: COD (cash on delivery)',
    `🏠 Area: ${esc(session.customer.area)}`, `👤 Naam: ${esc(session.customer.name)} | 📱 ${session.customer.phone_masked}`, '',
    'Prices and fees are demo values. Order confirm karne se pehle sab kuch dekh lijiye.'];
  return t.join('\n');
}
function kb(rows) { return { rows: rows.map(r => ({ row: { buttons: r.map(([text, data]) => ({ text, additionalFields: { callback_data: data } })) } })) }; }
function maskPhone(p) { const d = String(p).replace(/\D/g, ''); return d.length >= 4 ? d.slice(0, 2) + 'x'.repeat(d.length - 4) + d.slice(-2) : 'xx'; }


// ---- brand change by text ("chawal ka dusra brand", "daawat rozana gold") ----
function brandRowsInText(text, catalog) {
  const t = ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ') + ' ';
  const hit = r => { const b = r.brand.toLowerCase(); if (b !== 'local' && b !== 'farm fresh' && t.includes(' ' + b + ' ')) return 2; const v = r.variant.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 3); return v.length && v.every(w => t.includes(' ' + w + ' ')) ? 1 : 0; };
  return catalog.map(r => [hit(r), r]).filter(([h]) => h > 0).sort((a, b) => b[0] - a[0]).map(([, r]) => r);
}
function brandIntent(text, s) {
  if (!/brand|badal|badlo|dusra|doosra|change|alag|option|kaunsa|konsa|kaun ?sa/i.test(text)) return null;
  const ps = tokens(text).map(productOf).filter(Boolean);
  return s.items.find(it => ps.includes(it.product)) || (s.items.length === 1 ? s.items[0] : null);
}

// Devanagari names for voice lines (everything sent to Sarvam is Devanagari, owner rule 2026-10-08)
const HINDI = { atta: 'आटा', chawal: 'चावल', roti: 'रोटी', bhindi: 'भिंडी', aloo: 'आलू', pyaaz: 'प्याज़', tamatar: 'टमाटर', doodh: 'दूध', dahi: 'दही', dal: 'दाल',
  'moong dal': 'मूंग दाल', 'chana dal': 'चना दाल', 'masoor dal': 'मसूर दाल', suji: 'सूजी', besan: 'बेसन', poha: 'पोहा', cheeni: 'चीनी', namak: 'नमक', tel: 'तेल', ghee: 'घी',
  paneer: 'पनीर', makhan: 'मक्खन', ande: 'अंडे', bread: 'ब्रेड', chai: 'चाय', biscuit: 'बिस्कुट', maggi: 'मैगी', namkeen: 'नमकीन', sabun: 'साबुन', surf: 'सर्फ़', gobhi: 'गोभी',
  palak: 'पालक', dhaniya: 'धनिया', mirch: 'मिर्च', adrak: 'अदरक', lehsun: 'लहसुन', nimbu: 'नींबू', kheera: 'खीरा', lauki: 'लौकी', 'shimla mirch': 'शिमला मिर्च', kela: 'केला',
  seb: 'सेब', aam: 'आम', papita: 'पपीता', 'urad dal': 'उड़द दाल', rajma: 'राजमा', chole: 'छोले', sattu: 'सत्तू', maida: 'मैदा', 'soya chunks': 'सोया चंक्स', daliya: 'दलिया', haldi: 'हल्दी',
  'mirch powder': 'मिर्च पाउडर', 'dhaniya powder': 'धनिया पाउडर', 'garam masala': 'गरम मसाला', jeera: 'जीरा', sarson: 'सरसों', 'panch phoran': 'पंच फोरन', 'chaat masala': 'चाट मसाला', amchur: 'अमचूर',
  cheese: 'चीज़', lassi: 'लस्सी', rusk: 'रस्क', coffee: 'कॉफ़ी', 'cold drink': 'कोल्ड ड्रिंक', juice: 'जूस', pani: 'पानी', horlicks: 'हॉर्लिक्स', bournvita: 'बॉर्नविटा', chips: 'चिप्स', chocolate: 'चॉकलेट',
  pasta: 'पास्ता', ketchup: 'केचप', jam: 'जैम', achar: 'अचार', shahad: 'शहद', papad: 'पापड़', sewai: 'सेवई', kaju: 'काजू', badam: 'बादाम', kishmish: 'किशमिश', makhana: 'मखाना', dishwash: 'डिशवॉश',
  harpic: 'हार्पिक', phenyl: 'फिनाइल', machis: 'माचिस', agarbatti: 'अगरबत्ती', 'mosquito coil': 'मच्छर कॉइल', toothpaste: 'टूथपेस्ट', toothbrush: 'टूथब्रश', shampoo: 'शैम्पू', 'hair oil': 'हेयर ऑयल',
  'sanitary pad': 'सैनिटरी पैड', diaper: 'डायपर', baingan: 'बैंगन', karela: 'करेला', matar: 'मटर', gajar: 'गाजर', beans: 'बीन्स', 'patta gobhi': 'पत्ता गोभी', mooli: 'मूली', kaddu: 'कद्दू', parwal: 'परवल',
  nenua: 'नेनुआ', shakarkand: 'शकरकंद', methi: 'मेथी', pudina: 'पुदीना', santra: 'संतरा', anar: 'अनार', angoor: 'अंगूर', amrood: 'अमरूद', tarbooz: 'तरबूज़', nashpati: 'नाशपाती', litchi: 'लीची' };
const hi = p => HINDI[p] || p;
let CATALOG = []; // set per brain() call so ask() can list brands
// ---- state machine ----
const FIELDS = ['date', 'slot', 'name', 'phone', 'area'];
function missing(s) { if (s.items.some(it => it.qty === null)) return 'qty'; if (s.items.some(it => it.brand_chosen === false)) return 'brand'; for (const f of FIELDS) { if (f === 'date' && !s.delivery.date) return f; if (f === 'slot' && !s.delivery.slot) return f; if (f === 'phone' && !s.customer.phone_masked) return f; if (['name', 'area'].includes(f) && !s.customer[f]) return f; } return null; }
function ask(s, field, now) {
  const k = fmtDate(addDays(now, 1)), t = fmtDate(now);
  switch (field) {
    case 'brand': { const it = s.items.find(i => i.brand_chosen === false); const opts = brandsFor(CATALOG, it.product); return { voice: `${hi(it.product)} कौनसा ब्रांड चाहिए?`, text: `${cap(it.product)} kaunsa brand chahiye?`, keyboard: kb([...opts.map(r => [[`${r.brand} ${r.variant} ${money(r.unit_price_inr)}/${r.unit}`, `brand:${it.sku}:${r.sku}`]]), [['Koi bhi chalega', `brandany:${it.sku}`]]]) }; }
    case 'qty': { const it = s.items.find(i => i.qty === null); return { voice: `${hi(it.product)} कितना चाहिए?`, text: `${cap(it.product)} kitna chahiye? (jaise: 1 kg, 500 g)`, keyboard: kb([[['500 g', `qty:${it.product}:0.5:kg`], ['1 kg', `qty:${it.product}:1:kg`], ['2 kg', `qty:${it.product}:2:kg`]]]) }; }
    case 'date': return { voice: 'डिलीवरी कब चाहिए?', text: 'Delivery kab chahiye?', keyboard: kb([[['Aaj', `date:${t}`], ['Kal', `date:${k}`]]]) };
    case 'slot': return { voice: 'डिलीवरी का स्लॉट क्या रखें, सुबह या शाम?', text: 'Ek detail chahiye: Delivery slot kya rakhein?', keyboard: kb([[['Morning', 'slot:morning'], ['Evening', 'slot:evening']]]) };
    case 'name': return { voice: 'एक सवाल: आपका नाम क्या है?', text: 'Ek sawal: aapka naam kya hai?', keyboard: null };
    case 'phone': return { voice: 'आपका फ़ोन नंबर बताइए।', text: 'Aapka phone number? (10 digit)', keyboard: null };
    case 'area': return { voice: 'डिलीवरी किस इलाके में चाहिए?', text: 'Delivery area / mohalla kaunsa hai?', keyboard: kb([[['Kankarbagh', 'area:Kankarbagh'], ['Boring Road', 'area:Boring Road'], ['Patna City', 'area:Patna City']]]) };
  }
}
function newSession(chat_id) { return { chat_id, state: 'IDLE', items: [], delivery: { date: null, slot: null }, customer: { name: null, phone_masked: null, area: null }, change_log: [], order_id: null }; }
function nextOrderId(store, now) { const d = fmtDate(now).replace(/-/g, ''); store.seq = store.seq || {}; store.seq[d] = (store.seq[d] || 0) + 1; return `ORD-${d}-${String(store.seq[d]).padStart(4, '0')}`; }
function understood(s, now) { const lines = ['Maine yeh samjha:', ...s.items.map(it => it.qty === null ? `• ${cap(it.product)} (quantity?)` : itemLine(it))]; if (s.delivery.date) lines.push(`📅 Delivery: ${hinDate(s.delivery.date, now)}`); return lines.join('\n'); }
function collectOrReview(s, cfg, now, msgs) {
  const m = missing(s);
  if (m) { s.state = 'COLLECTING'; const a = ask(s, m, now); a.voice_text = a.voice || ''; delete a.voice; msgs.push(a); return; }
  s.state = 'REVIEW';
  msgs.push({ text: summary(s, cfg, now), keyboard: kb([[['✅ Confirm order', 'confirm'], ['✏️ Kuch badalna hai', 'edit']], [['❌ Cancel', 'cancel']]]) });
}
function changeSummary(s, old, nu, cfg) {
  const before = price({ items: s.items }, cfg), after = price({ items: s.items.map(it => it.sku === old.sku ? nu : it) }, cfg);
  return ['🔁 <b>Change summary</b>', `${cap(old.product)}: ${old.brand} ${old.qty} ${old.unit} ${money(old.line_total)} → ${nu.brand} ${nu.qty} ${nu.unit} ${money(nu.line_total)} (${nu.line_total >= old.line_total ? '+' : '-'}${money(Math.abs(nu.line_total - old.line_total))})`,
    `Items subtotal: ${money(before.items_subtotal)} → ${money(after.items_subtotal)}`, 'Delivery and handling fees: unchanged', `TOTAL: ${money(before.total)} → ${money(after.total)}`].join('\n');
}

// questions about the order or catalog (P6). Returns text or null.
function answerQuestion(text, s, catalog, cfg, now) {
  const t = String(text || '').toLowerCase();
  if (/stock|bache|bacha|kitne hain store|available kitn/.test(t)) return 'Stock ki jaankari main nahi de sakta.';
  if (/brand|option|variety|kaun ?se/.test(t)) { const p = tokens(t).map(productOf).find(Boolean); if (p && s.items.some(it => it.product === p)) return null; if (p) { const b = brandsFor(catalog, p); return b.length ? `${cap(p)} ke brand options (demo catalog):\n` + b.map(r => `• ${r.brand} ${r.variant} ${money(r.unit_price_inr)}/${r.unit}`).join('\n') : `${cap(p)} abhi catalog mein nahi hai.`; } }
  const has = s.items.length > 0;
  if (/kitne item|items? kitn|kya kya hai|list/.test(t)) return has ? `Aapke order mein ${s.items.length} item hain:\n` + s.items.map(itemLine).join('\n') : null;
  if (/total|kitna (paisa|hua|bill)|amount/.test(t)) return has ? `Total: ${money(price(s, cfg).total)} (demo values, COD)` : null;
  if (/delivery|kab aayega|kab milega/.test(t)) return has && s.delivery.date ? `📦 Delivery: ${hinDate(s.delivery.date, now)}, ${s.delivery.slot || '?'} slot` : null; // no order -> the FAQ bot answers
  return null;
}

function brain(update, store, cfg, now) {
  now = now || new Date();
  const catalog = loadCatalog(cfg); CATALOG = catalog;
  store.sessions = store.sessions || {};
  const cid = String(update.chat_id);
  let s = store.sessions[cid] || (store.sessions[cid] = newSession(cid));
  const msgs = [];
  const data = update.callback_data || '';
  const text = update.text || '';
  const swapOpen = () => s.state === 'SWAP_WINDOW' && now.getTime() < Date.parse(s.swap_expires_at);
  const expired = () => { msgs.push({ text: '⏱️ Change ka time nikal gaya. Order change ke liye Kuiklo support se contact karein.', keyboard: null }); s.state = 'CLOSED'; };

  // ---- button presses ----
  if (data) {
    if (data === 'confirm' && s.state === 'REVIEW') {
      s.state = 'SWAP_WINDOW'; s.order_id = nextOrderId(store, now); s.confirmed_at = now.toISOString(); s.swap_expires_at = new Date(now.getTime() + cfg.swap_window_s * 1000).toISOString();
      store.orders = store.orders || []; store.orders.push(JSON.parse(JSON.stringify({ ...s, charges: price(s, cfg), payment_mode: 'COD' })));
      msgs.push({ text: `✅ Aapka order process ho raha hai.\nOrder ID: ${s.order_id}\n\n⏱️ Ek minute ke andar koi change ho to abhi bata sakte hain.`, keyboard: kb([[['🔄 Order change karna hai', 'swap'], ['👍 Sab theek hai', 'ok']]]) });
    } else if (data === 'confirm') { msgs.push({ text: s.order_id ? `Order ${s.order_id} pehle hi confirm ho chuka hai.` : 'Abhi confirm karne ke liye koi order nahi hai.', keyboard: null }); }
    else if (data === 'edit' && s.state === 'REVIEW') { s.state = 'COLLECTING'; msgs.push({ text: 'Kya badalna hai? Item ka brand badalne ke liye item chunein, ya naya quantity likhiye (jaise "atta 2 kg").', keyboard: kb([s.items.map(it => [`${cap(it.product)} brand`, `editbrand:${it.sku}`]), [['✅ Kuch nahi, summary dikhao', 'review']]]) }); }
    else if (data.startsWith('editbrand:')) { const it = s.items.find(i => i.sku === data.slice(10)); if (it) { const opts = brandsFor(catalog, it.product); msgs.push({ text: `${cap(it.product)} ke brand options (demo catalog):`, keyboard: kb(opts.map(r => [[`${r.brand} ${r.variant} ${money(r.unit_price_inr)}/${r.unit}`, `brand:${it.sku}:${r.sku}`]])) }); } else collectOrReview(s, cfg, now, msgs); }
    else if (data === 'review') { collectOrReview(s, cfg, now, msgs); }
    else if (data === 'cancel') { store.sessions[cid] = newSession(cid); msgs.push({ text: '❌ Order cancel kar diya. Naya order ke liye voice note ya text bhejein.', keyboard: null }); }
    else if (data.startsWith('date:')) { s.delivery.date = data.slice(5); collectOrReview(s, cfg, now, msgs); }
    else if (data.startsWith('slot:')) { s.delivery.slot = data.slice(5); collectOrReview(s, cfg, now, msgs); }
    else if (data.startsWith('area:')) { s.customer.area = data.slice(5); collectOrReview(s, cfg, now, msgs); }
    else if (data.startsWith('brand:')) { const [, from, to] = data.split(':'); const idx = s.items.findIndex(i => i.sku === from); const row = catalog.find(r => r.sku === to); if (idx >= 0 && row && s.items[idx].qty !== null) { const old = s.items[idx]; s.items[idx] = { ...lineFor(row, old.qty), brand_chosen: true }; msgs.push({ text: `✔️ ${cap(old.product)}: ${row.brand} ${row.variant}`, keyboard: null }); } collectOrReview(s, cfg, now, msgs); }
    else if (data.startsWith('brandany:')) { const it = s.items.find(i => i.sku === data.slice(9)); if (it) it.brand_chosen = true; collectOrReview(s, cfg, now, msgs); }
    else if (data.startsWith('qty:')) { const [, p, q, u] = data.split(':'); const it = s.items.find(i => i.product === p); if (it) { const row = catalog.find(r => r.sku === it.sku) || defaultSku(catalog, p); Object.assign(it, lineFor(row, +q)); if (u) it.unit = u; } collectOrReview(s, cfg, now, msgs); }
    else if (data === 'ok') { msgs.push({ text: '👍 Shukriya! Order dispatch ke liye taiyaar hai.', keyboard: null }); }
    else if (data === 'swap') { if (!swapOpen()) { if (s.state === 'SWAP_WINDOW') expired(); else msgs.push({ text: 'Abhi koi confirmed order nahi hai.', keyboard: null }); } else msgs.push({ text: 'Kaunsa item badalna hai?', keyboard: kb([s.items.map(it => [cap(it.product), `swapitem:${it.sku}`])]) }); }
    else if (data.startsWith('swapitem:')) { if (!swapOpen()) expired(); else { const it = s.items.find(i => i.sku === data.slice(9)); const opts = brandsFor(catalog, it.product); msgs.push({ text: `${cap(it.product)} ke brand options (demo catalog):`, keyboard: kb(opts.map(r => [[`${r.brand} ${r.variant} ${money(r.unit_price_inr)}/${r.unit}`, `swapto:${it.sku}:${r.sku}`]])) }); } }
    else if (data.startsWith('swapto:')) { if (!swapOpen()) expired(); else { const [, from, to] = data.split(':'); const old = s.items.find(i => i.sku === from); const nu = lineFor(catalog.find(r => r.sku === to), old.qty); s.pending_swap = { from, to }; s.state = 'SWAP_PENDING'; msgs.push({ text: changeSummary(s, old, nu, cfg), keyboard: kb([[['✅ Change confirm karein', 'swapconfirm'], ['❌ Purana order rakhein', 'swapcancel']]]) }); } }
    else if (data === 'swapconfirm' && s.state === 'SWAP_PENDING') {
      if (now.getTime() >= Date.parse(s.swap_expires_at)) { expired(); } else {
        const { from, to } = s.pending_swap; const idx = s.items.findIndex(i => i.sku === from); const old = s.items[idx]; const nu = lineFor(catalog.find(r => r.sku === to), old.qty);
        s.items[idx] = nu; s.change_log.push({ at: now.toISOString(), reason: 'customer brand swap', before: old, after: nu, total_before: price({ items: s.items.map((it, i) => i === idx ? old : it) }, cfg).total, total_after: price(s, cfg).total });
        s.state = 'CLOSED'; delete s.pending_swap;
        msgs.push({ text: `✅ Aapke order mein change kar diya gaya hai. Updated order dispatch ho gaya.\nNaya total: ${money(price(s, cfg).total)}`, keyboard: null });
      }
    } else if (data === 'swapcancel') { delete s.pending_swap; s.state = swapOpen() ? 'SWAP_WINDOW' : 'CLOSED'; msgs.push({ text: 'Theek hai, purana order jaisa tha waisa hi rahega.', keyboard: null }); }
    else { msgs.push({ text: 'Yeh button ab kaam nahi karta. Naya order ke liye voice note ya text bhejein.', keyboard: null }); }
    return { messages: msgs.map(m => ({ chat_id: cid, ...m })), session: s };
  }

  // ---- text (typed or transcribed) ----
  if (!text.trim()) { msgs.push({ text: 'Kuch sunai nahi diya. Voice note dobara bhejein ya order type karein.', keyboard: null }); return { messages: msgs.map(m => ({ chat_id: cid, ...m })), session: s }; }
  if (/^\/start/.test(text)) { store.sessions[cid] = newSession(cid); msgs.push({ text: '👋 क्विकलो डेमो बॉट में स्वागत है!\n\nवॉइस नोट या टेक्स्ट भेजिए, जैसे:\n"1 kg atta, 2 roti, 3 kg bhindi, kal subah"\n\n⚠️ यह डेमो है। दाम डेमो वैल्यू हैं।', keyboard: null, voice_text: cfg.greeting_text || '' }); return { messages: msgs.map(m => ({ chat_id: cid, ...m })), session: s }; }

  // collecting a typed answer
  if (s.state === 'COLLECTING') {
    const m = missing(s);
    if (m === 'name' && !/\d/.test(text) && tokens(text).every(t => !productOf(t))) { s.customer.name = text.trim().slice(0, 40); collectOrReview(s, cfg, now, msgs); return { messages: msgs.map(x => ({ chat_id: cid, ...x })), session: s }; }
    if (m === 'phone' && /\d{10}/.test(text.replace(/\D/g, ''))) { s.customer.phone_masked = maskPhone(text); collectOrReview(s, cfg, now, msgs); return { messages: msgs.map(x => ({ chat_id: cid, ...x })), session: s }; }
    if (m === 'area' && tokens(text).every(t => !productOf(t))) { s.customer.area = text.trim().slice(0, 40); collectOrReview(s, cfg, now, msgs); return { messages: msgs.map(x => ({ chat_id: cid, ...x })), session: s }; }
  }
  // yes/no typed fallback in REVIEW
  if (s.state === 'REVIEW' && /^(haan|han|ha|yes|ok|confirm|theek|thik)\b/i.test(text.trim())) return brain({ ...update, text: '', callback_data: 'confirm' }, store, cfg, now);
  if (s.state === 'REVIEW' && /^(nahi|no|cancel)\b/i.test(text.trim())) return brain({ ...update, text: '', callback_data: 'cancel' }, store, cfg, now);

  // brand change typed as text (works before confirm, and inside the 60 s window after confirm)
  if (s.items.length && ['COLLECTING', 'REVIEW', 'SWAP_WINDOW', 'SWAP_PENDING'].includes(s.state)) {
    const rows = brandRowsInText(text, catalog);
    const target = rows.map(r => [r, s.items.find(it => it.product === r.product && it.sku !== r.sku)]).find(([, it]) => it);
    if (target) {
      const [row, old] = target;
      if (s.state === 'SWAP_WINDOW' || s.state === 'SWAP_PENDING') return brain({ ...update, text: '', callback_data: `swapto:${old.sku}:${row.sku}` }, store, cfg, now);
      const nu = { ...lineFor(row, old.qty), brand_chosen: true }; s.items[s.items.findIndex(i => i.sku === old.sku)] = nu;
      msgs.push({ text: `🔁 ${cap(old.product)}: ${old.brand} → ${nu.brand} ${nu.variant} (${money(nu.unit_price)}/${nu.unit})`, keyboard: null });
      collectOrReview(s, cfg, now, msgs); return { messages: msgs.map(m => ({ chat_id: cid, ...m })), session: s };
    }
    const it = brandIntent(text, s);
    if (it) {
      if (s.state === 'SWAP_WINDOW' || s.state === 'SWAP_PENDING') return brain({ ...update, text: '', callback_data: `swapitem:${it.sku}` }, store, cfg, now);
      const opts = brandsFor(catalog, it.product);
      msgs.push({ text: `${cap(it.product)} ke brand options (demo catalog):`, keyboard: kb(opts.map(r => [[`${r.brand} ${r.variant} ${money(r.unit_price_inr)}/${r.unit}`, `brand:${it.sku}:${r.sku}`]])) });
      return { messages: msgs.map(m => ({ chat_id: cid, ...m })), session: s };
    }
  }
  // question?
  const q = answerQuestion(text, s, catalog, cfg, now);
  const ex = extract(text, now);
  if (update.llm_items && update.llm_items.length) { ex.items = update.llm_items.map(li => ({ product: productOf(li.product) || li.product, qty: li.qty ?? null, unit: li.unit || null })).filter(li => productOf(li.product)); ex.unknown_terms = []; }
  // a question wins over an order unless the text carries a quantity ("2 kg atta" is an order, "atta ke brands?" is a question)
  if (q && (ex.items.length === 0 || ex.items.every(it => it.qty === null))) { msgs.push({ text: q, keyboard: null }); return { messages: msgs.map(m => ({ chat_id: cid, ...m })), session: s }; }
  if (ex.items.length === 0) {
    // not an order and not a known question: hand the text to the FAQ chatbot (n8n calls /ask when kb_query is set)
    msgs.push({ text: 'Mujhe order samajh nahi aaya. Item aur quantity bolein, jaise "1 kg atta, 2 roti".' + (ex.unknown_terms.length ? `\n(Yeh words nahi mile: ${esc(ex.unknown_terms.slice(0, 5).join(', '))})` : ''), keyboard: null, kb_query: text.trim() });
    return { messages: msgs.map(m => ({ chat_id: cid, ...m })), session: s };
  }
  // new order or edit: build items from catalog defaults
  if (['IDLE', 'CLOSED', 'CANCELLED', 'SWAP_WINDOW', 'REVIEW'].includes(s.state)) { const keep = s.customer; s = store.sessions[cid] = newSession(cid); if (s.state === 'IDLE' && keep.name) s.customer = { ...keep }; }
  for (const it of ex.items) {
    const row = defaultSku(catalog, it.product); if (!row) { ex.unknown_terms.push(it.product); continue; }
    let qty = it.qty, unit = it.unit || row.unit;
    if (row.unit === 'pcs' && qty === null) qty = 1;
    if (row.unit === 'pcs') unit = 'pcs';
    const line = qty === null ? { sku: row.sku, product: row.product, brand: row.brand, variant: row.variant, qty: null, unit: row.unit, unit_price: row.unit_price_inr, line_total: 0 } : lineFor(row, qty);
    line.brand_chosen = brandsFor(catalog, it.product).length <= 1; // one brand only -> nothing to ask
    const existing = s.items.findIndex(x => x.product === it.product);
    if (existing >= 0) s.items[existing] = line; else s.items.push(line);
  }
  for (const row of brandRowsInText(text, catalog)) { const idx = s.items.findIndex(i => i.product === row.product); if (idx >= 0 && s.items[idx].qty !== null) s.items[idx] = { ...lineFor(row, s.items[idx].qty), brand_chosen: true }; }
  if (ex.date) s.delivery.date = ex.date; if (ex.slot) s.delivery.slot = ex.slot;
  msgs.push({ text: understood(s, now) + (ex.unknown_terms.length ? `\n(Samajh nahi aaya: ${esc(ex.unknown_terms.slice(0, 5).join(', '))})` : ''), keyboard: null });
  collectOrReview(s, cfg, now, msgs);
  return { messages: msgs.map(m => ({ chat_id: cid, ...m })), session: s };
}

if (typeof module !== 'undefined' && module && module.exports) module.exports = { brain, extract, loadCatalog, price, summary, maskPhone, answerQuestion, ALIASES, HINDI };
