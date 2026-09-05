# Folio — личный учёт

PWA для семейного учёта финансов. Frontend на GitHub Pages, данные в Supabase.

- **Сайт:** https://e2lock.github.io/Folio/
- **Репо:** https://github.com/e2lock/Folio
- **Supabase:** `hachqbmborhqahwcqatr` (eu-central-1)

## Быстрый старт

### 1. Supabase (уже настроено)

`config.js` содержит URL и anon key проекта. Схема БД — в `supabase/migrations/`.

### 2. GitHub ↔ Supabase Integration

Подключение репозитория к проекту Supabase (миграции деплоятся автоматически):

1. Откройте [Integrations → GitHub](https://supabase.com/dashboard/project/hachqbmborhqahwcqatr/settings/integrations)
2. **Authorize GitHub** → выберите репозиторий **e2lock/Folio**
3. **Working directory:** `.` (корень репо, папка `supabase/` здесь)
4. Включите **Deploy to production** (push/merge в `main` → применяются миграции)
5. **Enable integration**

После push в `main` Supabase применит новые файлы из `supabase/migrations/`.

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
| `config.js` | URL и anon key Supabase |
| `db.js` | Загрузка и сохранение операций |
| `supabase/config.toml` | Конфиг для GitHub Integration |
| `supabase/migrations/` | Миграции БД (деплой через GitHub) |
| `supabase/schema.sql` | Справочная копия схемы |

**Не публикуйте** `service_role` key — только `anon` key в `config.js`.
