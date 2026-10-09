import type { APIRoute } from 'astro';
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { SITE } from '../../lib/site';

export const prerender = false;

const env = (k: string) => process.env[k] ?? '';
const DATA_DIR = env('DATA_DIR') || './data';
const FILE = `${DATA_DIR}/leads.jsonl`;
const KEEP_MS = 365 * 24 * 3600 * 1000; // срок хранения заявки — 1 год (политика, цель 1)
const KINDS: Record<string, string> = { audit: 'Аудит рекламы', forecast: 'Прогноз заявок', razbor: 'Разбор или прогноз' };

// Ограничение частоты: 5 заявок за 10 минут с одного IP
const hits = new Map<string, number[]>();
const limited = (ip: string) => {
  const now = Date.now(), arr = (hits.get(ip) || []).filter((t) => now - t < 600_000);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 5;
};

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

async function captchaOk(token: string, ip: string) {
  const secret = env('SMARTCAPTCHA_SERVER_KEY');
  if (!secret) return true; // капча не настроена — работают только ловушка и проверка времени
  if (!token) return false;
  try {
    const r = await fetch('https://smartcaptcha.yandexcloud.net/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, token, ip }),
      signal: AbortSignal.timeout(5000),
    });
    return (await r.json()).status === 'ok';
  } catch {
    return true; // сервис капчи недоступен — не теряем живую заявку
  }
}

async function store(rec: object) {
  await mkdir(DATA_DIR, { recursive: true });
  await appendFile(FILE, JSON.stringify(rec) + '\n', { mode: 0o600 });
  // Удаляем заявки старше срока хранения
  const now = Date.now();
  const lines = (await readFile(FILE, 'utf8')).split('\n').filter(Boolean);
  const keep = lines.filter((l) => { try { return now - Date.parse(JSON.parse(l).at) < KEEP_MS; } catch { return false; } });
  if (keep.length !== lines.length) await writeFile(FILE, keep.join('\n') + '\n', { mode: 0o600 });
}

async function mail(rec: { id: string; at: string; contact: string; kind: string; form: string }) {
  if (!env('SMTP_HOST')) return false;
  const t = nodemailer.createTransport({
    host: env('SMTP_HOST'), port: Number(env('SMTP_PORT') || 465), secure: env('SMTP_PORT') !== '587',
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
  });
  const kind = KINDS[rec.kind] || rec.kind;
  await t.sendMail({
    from: `"DIRECT.RECONCEPT" <${env('SMTP_USER')}>`,
    to: env('LEAD_TO') || 'hello@reconcept.ru',
    subject: `Заявка с direct.reconcept.ru: ${kind}`,
    text: `Контакт: ${rec.contact}\nЧто нужно: ${kind}\nФорма: ${rec.form}\nВремя: ${rec.at}\nID: ${rec.id}`,
    html: `<p><b>Контакт:</b> ${esc(rec.contact)}</p><p><b>Что нужно:</b> ${esc(kind)}</p><p><b>Форма:</b> ${esc(rec.form)}</p><p><b>Время:</b> ${rec.at}</p><p style="color:#888">ID: ${rec.id}</p>`,
  });
  return true;
}

// Уведомление в Telegram БЕЗ персональных данных (контакт — только в письме)
async function notify(kind: string) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID');
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: `Новая заявка с direct.reconcept.ru: ${KINDS[kind] || kind}. Контакт — в почте.` }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {}
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || '';
  if (limited(ip)) return json({ ok: false, error: 'rate' }, 429);

  let b: any;
  try { b = await request.json(); } catch { return json({ ok: false, error: 'bad' }, 400); }

  // Ловушка для ботов и проверка времени заполнения — тихо «принимаем», не сохраняя
  if (b.website || Number(b.t) < 2500) return json({ ok: true });

  const contact = String(b.contact ?? '').trim().replace(/\s+/g, ' ');
  if (contact.length < 3 || contact.length > 120) return json({ ok: false, error: 'contact' }, 400);
  if (b.consent !== true) return json({ ok: false, error: 'consent' }, 400);
  if (!(await captchaOk(String(b.token ?? ''), ip))) return json({ ok: false, error: 'captcha' }, 400);

  const rec = {
    id: randomUUID(),
    at: new Date().toISOString(),
    contact,
    kind: KINDS[b.kind] ? b.kind : 'razbor',
    form: ['hero', 'magnet', 'final'].includes(b.form) ? b.form : 'other',
    consent: { given: true, version: SITE.consentVersion, url: `${SITE.url}/consent` },
    ip,
    ua: (request.headers.get('user-agent') || '').slice(0, 300),
  };

  try { await store(rec); } catch (e) { console.error('store', e); }
  let sent = false;
  try { sent = await mail(rec); } catch (e) { console.error('mail', e); }
  await notify(rec.kind);
  if (!sent) console.warn('lead not emailed (SMTP not configured or failed)', rec.id);
  return json({ ok: true });
};

export const ALL: APIRoute = () => json({ ok: false, error: 'method' }, 405);
