# Folio — личный учёт

PWA для семейного учёта финансов. Frontend на GitHub Pages, данные в Supabase.

## Быстрый старт

### 1. Supabase

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard) → ваш проект.
2. **SQL Editor** → вставьте содержимое `supabase/schema.sql` → **Run**.
3. **Project Settings → API** — скопируйте:
   - **Project URL**
   - **anon public** key

### 2. Конфиг

Отредактируйте `config.js`:

```js
window.FOLIO_CONFIG = {
  supabaseUrl: "https://xxxxx.supabase.co",
  supabaseAnonKey: "eyJ...",
};
```

Закоммитьте и запушьте:

```powershell
git add config.js
git commit -m "Add Supabase config"
git push
```

### 3. GitHub Pages

Сайт: **https://e2lock.github.io/Folio/**

Settings → Pages → branch `main`, folder `/ (root)`.

## Локально

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

Откройте http://127.0.0.1:5173/

## Файлы

| Файл | Назначение |
|------|------------|
| `config.js` | URL и anon key Supabase |
| `db.js` | Загрузка и сохранение операций |
| `supabase/schema.sql` | Схема таблицы `transactions` |

**Не публикуйте** `service_role` key — только `anon` key в `config.js`.
