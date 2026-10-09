# direct.reconcept.ru

Лендинг «Настройка и ведение Яндекс Директа». Astro 5 (статические страницы) + Node-сервер для заявок.

## Что внутри
- `src/fragments/landing.html` — разметка главной (схемы РИС 1–6 уже внутри).
- `src/styles/global.css` — все стили.
- `src/scripts/landing.ts` — анимации, формы, FAQ; `src/scripts/site.ts` — cookie и Яндекс Метрика (только после «Принять»).
- `src/pages/policy.md`, `src/pages/consent.md` — политика и согласие.
- `src/pages/api/lead.ts` — приём заявок: проверка согласия, ловушка для ботов, Yandex SmartCaptcha, лимит 5 заявок / 10 мин с IP, запись в `/data/leads.jsonl` (хранится 1 год), письмо на `LEAD_TO`, уведомление в Telegram без контакта.
- `server.mjs` — отдаёт сайт со сжатием и заголовками безопасности.

## Выкладка в Coolify
1. Coolify → Projects → ваш проект → **+ New** → **Private Repository (with GitHub App)** → репозиторий с этим кодом.
2. Build Pack: **Dockerfile**. Port: **4321**.
3. Domains: `https://direct.reconcept.ru`.
4. **Storages** → Add → Volume: путь в контейнере `/data`.
5. **Environment Variables** — по файлу `.env.example`. `PUBLIC_YM_ID` и `PUBLIC_SMARTCAPTCHA_KEY` отметить как **Build Variable**.
6. **Deploy**.

## DNS (в Beget)
Запись **A**: `direct` → `103.88.243.96`.

## Проверка после запуска
- https://direct.reconcept.ru, /policy, /consent открываются.
- Отправить тестовую заявку → письмо на hello@reconcept.ru.
- Заявки также лежат на сервере: том `/data`, файл `leads.jsonl`.
