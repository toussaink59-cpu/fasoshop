const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export function url(p) { return BASE_URL + p; }

export async function req(method, path, { headers = {}, body } = {}) {
  try {
    const res = await fetch(url(path), {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch {}
    return { status: res.status, headers: res.headers, data, text };
  } catch (e) {
    return { error: e.message };
  }
}

export function report(name, passed, detail = '') {
  const icon = passed ? 'PASS' : 'FAIL';
  console.log(`[${icon}] ${name}${detail ? ' — ' + detail : ''}`);
  return passed;
}
