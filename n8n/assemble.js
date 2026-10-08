// Builds n8n/build/workflow.json from code/*.js + catalog.csv. Run: node n8n/assemble.js
// Source of truth is this repo, never the n8n UI (rulebook C1).
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const brainSrc = fs.readFileSync(path.join(ROOT, 'code', 'brain.js'), 'utf8');
const csv = fs.readFileSync(path.join(ROOT, 'catalog.csv'), 'utf8').trim().split('\n');
const hdr = csv[0].split(',');
const catalog = csv.slice(1).map(l => Object.fromEntries(l.split(',').map((v, i) => [hdr[i], v])));

const TG = { telegramApi: { id: 'ErynbU8X1vKpaTRO', name: 'Kuiklo Demo Bot' } };
const OPENROUTER = { openRouterApi: { id: '3UvcSxPc55DLZzwJ', name: 'klickbae8yt@gmail.com' } };

const code = {
  normalize: `// One update in (message or callback_query) -> one flat item out
const u = $('Telegram Trigger').first().json; // Config replaced the item fields, so read the raw update
const cb = u.callback_query, m = u.message || (cb && cb.message);
const chat_id = String((cb ? cb.message.chat.id : m.chat.id));
return [{ json: {
  chat_id,
  text: cb ? '' : (m.text || ''),
  callback_data: cb ? (cb.data || '') : '',
  callback_query_id: cb ? cb.id : '',
  voice_file_id: (!cb && m.voice) ? m.voice.file_id : '',
  from_name: ((cb ? cb.from : m.from) || {}).first_name || '',
  is_voice: !!(!cb && m.voice),
}}];`,
  mergeStt: `// Put the STT text onto the normalized item
const base = $('Normalize').first().json;
const stt = $input.first().json;
return [{ json: { ...base, text: (stt.text || '').trim(), stt_seconds: stt.seconds } }];`,
  extractCheck: `${brainSrc}
// Rules first. Ask the LLM only when rules found nothing and there are unknown words.
const cfg = $('Config').first().json;
const u = $input.first().json;
const ex = (u.text && !u.callback_data) ? extract(u.text, new Date()) : { items: [], unknown_terms: [] };
const needs_llm = !!(cfg.use_llm_fallback && u.text && !u.callback_data && ex.items.length === 0 && ex.unknown_terms.length > 0 && !/^\\/start/.test(u.text));
return [{ json: { ...u, needs_llm, rules_items: ex.items, unknown_terms: ex.unknown_terms } }];`,
  parseLlm: `// OpenRouter reply -> llm_items on the normalized item. Any parse problem -> no items (rules answer instead).
const base = $('Extract check').first().json;
const r = $input.first().json;
let items = [];
try {
  const c = (r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content) || '';
  const m = c.match(/\\[[\\s\\S]*\\]/);
  items = m ? JSON.parse(m[0]) : [];
  if (!Array.isArray(items)) items = [];
} catch (e) { items = []; }
return [{ json: { ...base, llm_items: items, llm_model: r.model || null } }];`,
  kbReply: `// FAQ answer from the KB service replaces the fallback text. Keep the fallback if the service gave nothing.
const base = $('Order brain').first().json;
const r = $input.first().json;
const answer = (r.answer || '').trim();
const text = answer ? answer + (r.model ? '' : '') : base.text;
return [{ json: { ...base, text, kb_score: r.score, kb_model: r.model, kb_query: undefined } }];`,
  brain: `${brainSrc}
const cfg = $('Config').first().json;
const store = $getWorkflowStaticData('global');
const u = $input.first().json;
const out = brain(u, store, cfg, new Date());
return out.messages.map(m => ({ json: { ...m, callback_query_id: u.callback_query_id || '', parse_mode: 'HTML' } }));`,
};

const nodes = [
  { name: 'Telegram Trigger', type: 'n8n-nodes-base.telegramTrigger', typeVersion: 1.3, position: [-900, 300], webhookId: 'kuiklo-order-bot',
    parameters: { updates: ['message', 'callback_query'], additionalFields: {} }, credentials: TG },
  { name: 'Config', type: 'n8n-nodes-base.set', typeVersion: 3.4, position: [-680, 300], parameters: { options: {}, assignments: { assignments: [
    { id: 'c1', name: 'kill_switch', type: 'boolean', value: false },
    { id: 'c2', name: 'delivery_fee_inr', type: 'number', value: 25 },
    { id: 'c3', name: 'handling_fee_inr', type: 'number', value: 5 },
    { id: 'c4', name: 'swap_window_s', type: 'number', value: 60 },
    { id: 'c5', name: 'stt_url', type: 'string', value: 'http://127.0.0.1:8787/transcribe' },
    { id: 'c9', name: 'kb_url', type: 'string', value: 'http://127.0.0.1:8787/ask' },
    { id: 'c6', name: 'use_llm_fallback', type: 'boolean', value: true },
    { id: 'c7', name: 'llm_model', type: 'string', value: 'deepseek/deepseek-v3.2' },
    { id: 'c8', name: 'catalog_json', type: 'string', value: JSON.stringify(catalog) },
  ] } } },
  { name: 'Kill switch?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [-460, 300], parameters: { options: {}, conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, combinator: 'and',
    conditions: [{ id: 'k1', operator: { type: 'boolean', operation: 'false', singleValue: true }, leftValue: '={{ $json.kill_switch }}', rightValue: '' }] } } },
  { name: 'Normalize', type: 'n8n-nodes-base.code', typeVersion: 2, position: [-240, 300], parameters: { jsCode: code.normalize } },
  { name: 'Voice?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [-20, 300], parameters: { options: {}, conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, combinator: 'and',
    conditions: [{ id: 'v1', operator: { type: 'boolean', operation: 'true', singleValue: true }, leftValue: '={{ $json.is_voice }}', rightValue: '' }] } } },
  { name: 'Telegram: get voice file', type: 'n8n-nodes-base.telegram', typeVersion: 1.2, position: [200, 160], parameters: { resource: 'file', operation: 'get', fileId: '={{ $json.voice_file_id }}', download: true }, credentials: TG },
  { name: 'STT (bhavna on Oracle)', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [420, 160], parameters: { method: 'POST', url: "={{ $('Config').first().json.stt_url }}", sendBody: true, contentType: 'binaryData', inputDataFieldName: 'data', options: { timeout: 60000 } } },
  { name: 'Merge STT text', type: 'n8n-nodes-base.code', typeVersion: 2, position: [640, 160], parameters: { jsCode: code.mergeStt } },
  { name: 'Extract check', type: 'n8n-nodes-base.code', typeVersion: 2, position: [860, 300], parameters: { jsCode: code.extractCheck } },
  { name: 'Needs LLM?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [1080, 300], parameters: { options: {}, conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, combinator: 'and',
    conditions: [{ id: 'l1', operator: { type: 'boolean', operation: 'true', singleValue: true }, leftValue: '={{ $json.needs_llm }}', rightValue: '' }] } } },
  { name: 'OpenRouter extract', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1300, 160], parameters: { method: 'POST', url: 'https://openrouter.ai/api/v1/chat/completions', authentication: 'predefinedCredentialType', nodeCredentialType: 'openRouterApi', sendBody: true, specifyBody: 'json',
    jsonBody: `={{ JSON.stringify({ model: $('Config').first().json.llm_model, temperature: 0, max_tokens: 300, messages: [
  { role: 'system', content: 'You extract grocery order items from Hinglish text. Known products: atta, roti, bhindi, aloo, pyaaz, tamatar, doodh, dahi, chawal, dal, cheeni, tel, namak, ande, bread. Reply with ONLY a JSON array like [{"product":"atta","qty":1,"unit":"kg"}]. Map synonyms to the known product names. qty null if not said. unit is kg or pcs. Empty array if no order.' },
  { role: 'user', content: $json.text } ] }) }}`, options: { timeout: 30000 } }, credentials: OPENROUTER, onError: 'continueRegularOutput' },
  { name: 'Parse LLM', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1520, 160], parameters: { jsCode: code.parseLlm } },
  { name: 'Order brain', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1740, 300], parameters: { jsCode: code.brain } },
  { name: 'FAQ question?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [1960, 300], parameters: { options: {}, conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 }, combinator: 'and',
    conditions: [{ id: 'f1', operator: { type: 'string', operation: 'notEmpty', singleValue: true }, leftValue: '={{ $json.kb_query || "" }}', rightValue: '' }] } } },
  { name: 'KB ask (MiniLM + Ollama)', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [2180, 160], parameters: { method: 'POST', url: "={{ $('Config').first().json.kb_url }}", sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify({ question: $json.kb_query }) }}', options: { timeout: 90000 } } },
  { name: 'KB reply', type: 'n8n-nodes-base.code', typeVersion: 2, position: [2400, 160], parameters: { jsCode: code.kbReply } },
  { name: 'Telegram: send', type: 'n8n-nodes-base.telegram', typeVersion: 1.2, position: [2620, 300], parameters: { chatId: '={{ $json.chat_id }}', text: '={{ $json.text }}',
    replyMarkup: '={{ $json.keyboard ? "inlineKeyboard" : "none" }}', inlineKeyboard: '={{ $json.keyboard || {} }}',
    additionalFields: { appendAttribution: false, parse_mode: 'HTML', disable_web_page_preview: true } }, credentials: TG },
  { name: 'Telegram: ack button', type: 'n8n-nodes-base.telegram', typeVersion: 1.2, position: [1960, 500], parameters: { resource: 'callback', operation: 'answerQuery', queryId: "={{ $('Order brain').first().json.callback_query_id }}", additionalFields: {} }, credentials: TG },
  { name: 'Button press?', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [2180, 300], parameters: { options: {}, conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, combinator: 'and',
    conditions: [{ id: 'b1', operator: { type: 'string', operation: 'notEmpty', singleValue: true }, leftValue: "={{ $('Order brain').first().json.callback_query_id }}", rightValue: '' }] } } },
];
// positions fix for ack after Button press?
nodes.find(n => n.name === 'Telegram: ack button').position = [3060, 300];
nodes.find(n => n.name === 'Button press?').position = [2840, 300];

const main = (a, b, i = 0) => ({ [a]: { main: Object.assign([], { [i]: [{ node: b, type: 'main', index: 0 }] }) } });
const connections = {};
const link = (a, b, i = 0) => { connections[a] = connections[a] || { main: [] }; connections[a].main[i] = connections[a].main[i] || []; connections[a].main[i].push({ node: b, type: 'main', index: 0 }); };
link('Telegram Trigger', 'Config');
link('Config', 'Kill switch?');
link('Kill switch?', 'Normalize', 0);            // true = kill_switch is false -> continue
link('Normalize', 'Voice?');
link('Voice?', 'Telegram: get voice file', 0);   // true
link('Voice?', 'Extract check', 1);              // false
link('Telegram: get voice file', 'STT (bhavna on Oracle)');
link('STT (bhavna on Oracle)', 'Merge STT text');
link('Merge STT text', 'Extract check');
link('Extract check', 'Needs LLM?');
link('Needs LLM?', 'OpenRouter extract', 0);     // true
link('Needs LLM?', 'Order brain', 1);            // false
link('OpenRouter extract', 'Parse LLM');
link('Parse LLM', 'Order brain');
link('Order brain', 'FAQ question?');
link('FAQ question?', 'KB ask (MiniLM + Ollama)', 0); // true: free text that is not an order
link('FAQ question?', 'Telegram: send', 1);           // false: normal bot message
link('KB ask (MiniLM + Ollama)', 'KB reply');
link('KB reply', 'Telegram: send');
link('Telegram: send', 'Button press?');
link('Button press?', 'Telegram: ack button', 0); // true
for (const [k, v] of Object.entries(connections)) for (let i = 0; i < v.main.length; i++) v.main[i] = v.main[i] || [];

const workflow = {
  name: 'Kuiklo MAIN 01 Telegram Order Bot',
  nodes: nodes.map(n => ({ ...n, id: n.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') })),
  connections,
  settings: { executionOrder: 'v1', timezone: 'Asia/Kolkata', saveExecutionProgress: true, errorWorkflow: 'uiKA54V6gWkhQ69W', callerPolicy: 'workflowsFromSameOwner' },
  staticData: null,
};
fs.mkdirSync(path.join(ROOT, 'build'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'build', 'workflow.json'), JSON.stringify(workflow, null, 1));
console.log('built', workflow.nodes.length, 'nodes ->', path.join(ROOT, 'build', 'workflow.json'));
