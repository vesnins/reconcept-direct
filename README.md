# direct.reconcept.ru

Лендинг «Настройка и ведение Яндекс Директа». Astro 5 (статические страницы) + Node-сервер статики. Заявки — в Telegram, MAX и на почту, сайт сам данные не собирает.

## Что внутри
- `src/fragments/landing.html` — разметка главной (схемы РИС 1–6 уже внутри).
- `src/styles/global.css` — все стили.
- `src/scripts/landing.ts` — анимации, FAQ; `src/scripts/site.ts` — cookie и Яндекс Метрика (только после «Принять»).
- `src/pages/policy.md` — политика.
- `server.mjs` — отдаёт сайт со сжатием и заголовками безопасности.

## Выкладка в Coolify
1. Coolify → Projects → ваш проект → **+ New** → **Private Repository (with GitHub App)** → репозиторий с этим кодом.
2. Build Pack: **Dockerfile**. Port: **4321**.
3. Domains: `https://direct.reconcept.ru`.
4. **Environment Variables**: `PUBLIC_YM_ID` (Build Variable).
5. **Deploy**.

## DNS (в Beget)
Запись **A**: `direct` → `103.88.243.96`.

## Проверка после запуска
- https://direct.reconcept.ru и /policy открываются.
- Кнопки Telegram, MAX и почта открывают чат/письмо; в Метрике срабатывают цели `click_telegram`, `click_max`, `click_email` и общая `contact`.
