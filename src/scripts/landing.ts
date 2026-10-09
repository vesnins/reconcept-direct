// Анимации рисунков, переключатель РИС 2, формы заявок, FAQ-барабан, липкая кнопка.
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string) => [...document.querySelectorAll(s)] as T[];

/* Рисунки: покой = финальный кадр; .pre ставится только до появления на экране */
$$<SVGSVGElement>('svg.art').forEach((svg) => {
  const fig = svg.closest('.fig') as HTMLElement | null;
  const usePre = fig?.dataset.anim === 'pre';
  svg.pauseAnimations?.();
  if (still) { svg.setCurrentTime?.(2.4); return; }
  if (usePre) svg.classList.add('pre');
  new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) {
        svg.unpauseAnimations?.();
        if (svg.classList.contains('pre')) { void svg.getBoundingClientRect(); setTimeout(() => svg.classList.remove('pre'), 500); }
        svg.classList.add('run');
      } else svg.pauseAnimations?.();
    }
  }, { threshold: 0.3 }).observe(fig || svg);
});

/* РИС 2 — «Сейчас / После настройки» */
const lk = $<SVGSVGElement>('svg.leaks');
const seg = $$<HTMLButtonElement>('.seg button');
let auto: number | undefined; let userSet = false;
const setSt = (st: string) => { lk.classList.toggle('fixed', st === 'fixed'); seg.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.st === st))); };
seg.forEach((b) => b.addEventListener('click', () => { userSet = true; clearInterval(auto); setSt(b.dataset.st!); }));
if (!still) new IntersectionObserver((e) => {
  if (e[0].isIntersecting && !userSet && !auto) auto = window.setInterval(() => setSt(lk.classList.contains('fixed') ? 'now' : 'fixed'), 4500);
}, { threshold: 0.4 }).observe(lk);

/* Лид-магнит: текст кнопки */
const bm = $<HTMLButtonElement>('#b-magnet');
$$<HTMLInputElement>('input[name=kind]').forEach((r) => r.addEventListener('change', () => { bm.textContent = r.value === 'audit' ? 'Получить аудит' : 'Получить прогноз'; }));

/* SmartCaptcha (невидимая): грузится при первом взаимодействии с формой */
const captchaKey = document.body.dataset.captcha || '';
let capReady: Promise<void> | null = null; let widget: number | undefined; let capResolve: ((t: string) => void) | null = null;
const loadCaptcha = () => {
  if (!captchaKey) return Promise.resolve();
  return (capReady ??= new Promise<void>((res, rej) => {
    (window as any).__capInit = () => {
      widget = (window as any).smartCaptcha.render($('#captcha'), {
        sitekey: captchaKey, invisible: true, hideShield: true,
        callback: (t: string) => { capResolve?.(t); capResolve = null; },
      });
      res();
    };
    const s = document.createElement('script');
    s.src = 'https://smartcaptcha.yandexcloud.net/captcha.js?render=onload&onload=__capInit';
    s.defer = true; s.onerror = () => rej(new Error('captcha')); document.head.appendChild(s);
  }));
};
const getToken = async () => {
  if (!captchaKey) return '';
  await loadCaptcha();
  const sc = (window as any).smartCaptcha;
  return new Promise<string>((res) => { capResolve = res; sc.reset(widget); sc.execute(widget); });
};

/* Формы */
const started = Date.now();
$$<HTMLFormElement>('form[data-form]').forEach((f) => {
  f.addEventListener('focusin', () => { loadCaptcha().catch(() => {}); }, { once: true });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inp = f.querySelector('input[name=contact]') as HTMLInputElement;
    const pd = f.querySelector('input[name=pd]') as HTMLInputElement;
    const msg = f.querySelector('.msg') as HTMLElement;
    const btn = f.querySelector('button[type=submit]') as HTMLButtonElement;
    const v = inp.value.trim();
    const say = (t: string, ok = false) => { msg.textContent = t; msg.classList.toggle('ok', ok); msg.classList.toggle('err', !ok); };
    if (v.length < 3) { say('Укажите ваш Telegram или MAX.'); inp.focus(); return; }
    if (!pd.checked) { say('Отметьте согласие на обработку персональных данных.'); pd.focus(); return; }
    btn.disabled = true; say('Отправляю…', true);
    try {
      const token = await getToken();
      const kind = (f.querySelector('input[name=kind]:checked') as HTMLInputElement | null)?.value || 'razbor';
      const r = await fetch('/api/lead', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: v, kind, form: f.dataset.form, consent: true, token,
          website: (f.querySelector('input[name=website]') as HTMLInputElement).value, t: Date.now() - started }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || 'send');
      say('Заявка отправлена. Свяжусь с вами в Telegram или MAX.', true);
      f.reset(); window.goal?.('lead_' + f.dataset.form); window.goal?.('lead');
    } catch (err) {
      say(err instanceof Error && err.message === 'rate' ? 'Слишком много заявок подряд. Попробуйте через несколько минут.' : 'Не получилось отправить. Напишите мне в Telegram или MAX — ссылки внизу страницы.');
    } finally { btn.disabled = false; }
  });
});

/* FAQ — барабан */
const items = $$<HTMLLIElement>('#drum li');
const pq = $('#pq'), pa = $('#pa'), panel = $('#panel'), drum = $('#drum');
let cur = 0, tmr: number | undefined;
const layout = () => {
  const r = innerWidth <= 900 ? 50 : 56, L = items.length;
  items.forEach((li, i) => {
    let off = ((i - cur) % L + L) % L; if (off > L / 2) off -= L;
    const a = Math.abs(off);
    li.style.transform = `translateY(${off * r}px) rotateX(${-off * 9}deg)`;
    li.style.filter = a ? `blur(${Math.min(a * 1.6, 5)}px)` : 'none';
    li.style.opacity = String(a > 3 ? 0 : 1 - a * 0.2);
    li.classList.toggle('on', !a); li.setAttribute('aria-selected', String(!a)); li.id = 'q' + i;
  });
  drum.setAttribute('aria-activedescendant', 'q' + cur);
};
const show = (i: number, anim: boolean) => {
  cur = (i + items.length) % items.length; layout();
  const q = items[cur].querySelector('.q')!.textContent || '', a = items[cur].querySelector('.a')!.innerHTML;
  clearTimeout(tmr);
  pq.textContent = q;
  if (!anim || still) { pa.innerHTML = a; return; }
  panel.classList.add('load');
  tmr = window.setTimeout(() => { pa.innerHTML = a; panel.classList.remove('load'); }, 420);
};
items.forEach((li, i) => li.addEventListener('click', () => show(i, true)));
$('#up').addEventListener('click', () => show(cur - 1, true));
$('#dn').addEventListener('click', () => show(cur + 1, true));
drum.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') { e.preventDefault(); show(cur - 1, true); }
  if (e.key === 'ArrowDown') { e.preventDefault(); show(cur + 1, true); }
});
let ty: number | null = null;
drum.addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
drum.addEventListener('touchend', (e) => { if (ty === null) return; const d = e.changedTouches[0].clientY - ty; if (Math.abs(d) > 30) show(cur + (d < 0 ? 1 : -1), true); ty = null; });
addEventListener('resize', layout);
show(0, false);

/* Липкая кнопка: видна, когда формы вне экрана */
const stick = $('#stick'), vis = new Map<Element, boolean>();
const io2 = new IntersectionObserver((e) => {
  e.forEach((en) => vis.set(en.target, en.isIntersecting));
  stick.classList.toggle('show', ![...vis.values()].some(Boolean) && scrollY > 200);
});
['#f-hero', '#cta', '#f-magnet'].forEach((s) => io2.observe($(s)));

export {};
