# Folio — личный учёт

PWA для семейного учёта финансов. Frontend на GitHub Pages, данные в Supabase.

- **Сайт:** https://e2lock.github.io/Folio/
- **Репо:** https://github.com/e2lock/Folio
- **Supabase:** `hachqbmborhqahwcqatr` (eu-central-1)

Доступ только после входа. Журнал рассчитан на двоих: первый создаёт household, второй входит по коду.

## Быстрый старт

### 1. Supabase Auth

В [Authentication → Providers](https://supabase.com/dashboard/project/hachqbmborhqahwcqatr/auth/providers) включите Email.

В [URL Configuration](https://supabase.com/dashboard/project/hachqbmborhqahwcqatr/auth/url-configuration) должны быть:

- Site URL: `https://e2lock.github.io/Folio/`
- Redirect: `https://e2lock.github.io/Folio/` и `http://127.0.0.1:5173/`

Для двоих удобно выключить Confirm email, иначе второму аккаунту нужно письмо.

### 2. Первый и второй человек

1. Откройте сайт → **Создать аккаунт**.
2. Нажмите **Создать журнал** — появится код в боковой колонке.
3. Второй человек регистрируется и вводит этот код.

Anon key в `config.js` публичный. Данные закрывает RLS, не ключ.

### 3. GitHub Pages

Settings → Pages → branch `main`, folder `/ (root)`.

## Локально

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

Откройте http://127.0.0.1:5173/

## Файлы

| Файл | Назначение |
|------|------------|
| `config.js` | Публичный URL и anon key |
| `db.js` | Auth, household, операции |
| `supabase/migrations/` | Схема и RLS |
| `AGENTS.md` / `SECURITY.md` | Правила для агента и инцидент |

**Не публикуйте** `service_role` key.
