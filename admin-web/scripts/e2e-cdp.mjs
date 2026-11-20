// E2E del panel con Edge headless vía Chrome DevTools Protocol (Node 24+, WebSocket nativo).
// Uso: 1) npm run dev  2) msedge --headless --remote-debugging-port=9333 --user-data-dir=<tmp> about:blank
//      3) E2E_EMAIL=... E2E_PASSWORD=... E2E_OPERATOR="<nombre del operador>" node scripts/e2e-cdp.mjs
// Requiere el backend en ejecución (no hay datos de simulación). Opcionales: E2E_CATEGORY, E2E_APP, E2E_WAIT_FACTOR.
// Requiere al menos un reporte pendiente; el paso 6 lo pasa a «En revisión».
const PORT = 9333;
const APP = process.env.E2E_APP ?? 'http://localhost:5173';
const { E2E_EMAIL: EMAIL, E2E_PASSWORD: PASSWORD, E2E_OPERATOR: OPERATOR } = process.env;
if (!EMAIL || !PASSWORD || !OPERATOR) {
  console.error('Faltan E2E_EMAIL, E2E_PASSWORD y/o E2E_OPERATOR (credenciales de un operador real).');
  process.exit(2);
}
const CATEGORY = process.env.E2E_CATEGORY ?? 'calle_anegada';
// Factor de espera para redes lentas (Supabase Auth). 2.5 alcanza en la red local.
const WAIT = Number(process.env.E2E_WAIT_FACTOR ?? 2.5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms * WAIT));

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (res.result?.exceptionDetails) throw new Error(JSON.stringify(res.result.exceptionDetails));
  return res.result?.result?.value;
};
const go = async (path, wait = 3500) => {
  await send('Page.navigate', { url: APP + path });
  await sleep(wait);
};
const results = [];
const check = (name, ok, info = '') => {
  results.push({ name, ok, info });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${info ? ' -> ' + info : ''}`);
};

await send('Page.enable');
await send('Runtime.enable');

// 1. Sin sesión => /login
await go('/login', 1500);
await evaluate('localStorage.clear()');
await go('/dashboard');
check('sin sesión redirige a /login', (await evaluate('location.pathname')) === '/login');

// 2. Login real a través del formulario
await evaluate(`(() => {
  const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  set(document.querySelector('input[type=email]'), ${JSON.stringify(EMAIL)});
  set(document.querySelector('input[type=password]'), ${JSON.stringify(PASSWORD)});
})()`);
await sleep(200);
await evaluate(`document.querySelector('button[type=submit]').click()`);
await sleep(3500);
check('login navega a /dashboard', (await evaluate('location.pathname')) === '/dashboard');
const kpis = await evaluate(`[...document.querySelectorAll('.text-3xl')].map(e => e.textContent)`);
check('dashboard muestra 7 KPIs', kpis?.length === 7, JSON.stringify(kpis));
check('dashboard renderiza mapa', await evaluate(`!!document.querySelector('.maplibregl-canvas')`));

// 3. Tabla filtrada por categoría
await go(`/reports?category=${CATEGORY}`);
const cats = await evaluate(`[...document.querySelectorAll('tbody tr')].map(tr => tr.children[1]?.textContent)`);
check(`filtro ${CATEGORY}`, cats.length > 0 && cats.every((c) => c === cats[0]), JSON.stringify(cats));
const pag = await evaluate(`document.body.innerText.match(/\\d+–\\d+ de \\d+/)?.[0]`);
check('paginación visible', Boolean(pag), pag);

// 4. Mapa a pantalla completa
await go('/map');
check('mapa /map con filtros', await evaluate(`!!document.querySelector('.maplibregl-canvas') && !!document.querySelector('select[aria-label=Categoría]')`));

// 5. Ficha de un pendiente (navegación SPA)
await go('/reports?status=pendiente');
await evaluate(`document.querySelector('tbody a').click()`);
await sleep(3000);
const detailText = await evaluate('document.body.innerText');
check('ficha muestra historial y ciudadano', /Historial/.test(detailText) && /Ciudadano/.test(detailText) && /Teléfono/.test(detailText));
check('ficha muestra comentario del ciudadano', !/Comentario del ciudadano\s*No disponible/.test(detailText));

// 6. Cambio de estado pendiente -> en_revision
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Actualizar estado').click()`);
await sleep(500);
const radios = await evaluate(`[...document.querySelectorAll('[role=dialog] input[type=radio]')].map(r => r.value)`);
check('modal ofrece solo transiciones válidas', JSON.stringify(radios) === '["en_revision","descartado"]', JSON.stringify(radios));
check('notificar marcado por defecto', await evaluate(`document.querySelector('[role=dialog] input[type=checkbox]').checked`));
// Validación: enviar sin comentario
await evaluate(`[...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.trim() === 'Actualizar estado').click()`);
await sleep(300);
check('valida comentario obligatorio', /al menos 5 caracteres/.test(await evaluate(`document.querySelector('[role=dialog]').innerText`)));
await evaluate(`(() => {
  document.querySelector('[role=dialog] input[value=en_revision]').click();
  const ta = document.querySelector('[role=dialog] textarea');
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, 'Cuadrilla enviada al lugar para evaluación.');
  ta.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
await sleep(300);
await evaluate(`[...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.trim() === 'Actualizar estado').click()`);
await sleep(2500);
const after = await evaluate('document.body.innerText');
check('modal cerrado tras guardar', !(await evaluate(`!!document.querySelector('[role=dialog]')`)));
check('toast de éxito', /estado actualizado a En revisión/.test(after));
check('historial refleja el cambio con operador', /Cuadrilla enviada al lugar para evaluación\./.test(after) && after.includes(OPERATOR));

// 7. Volver al dashboard (SPA): KPI pendientes bajó
await evaluate(`document.querySelector('a[href="/dashboard"]').click()`);
await sleep(2500);
const kpisAfter = await evaluate(`[...document.querySelectorAll('.text-3xl')].map(e => e.textContent)`);
check('KPI pendientes revalidado', Number(kpisAfter?.[1]) === Number(kpis?.[1]) - 1, `${kpis?.[1]} -> ${kpisAfter?.[1]}`);

// 8. Salir
await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Salir').click()`);
await sleep(800);
check('logout vuelve a /login', (await evaluate('location.pathname')) === '/login');

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} verificaciones OK`);
ws.close();
process.exit(failed ? 1 : 0);
