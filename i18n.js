const MESSAGES = {
    appTitle: "Folio — личный учёт",
    brandSubtitle: "Журнал за {month}",
    railFoot: "Два журнала: Егор и Надежда. Данные только после входа.",
    navOverview: "Обзор",
    navActivity: "Операции",
    ariaOverview: "Обзор",
    ariaActivity: "Операции",
    greetingMorning: "Доброе утро",
    greetingAfternoon: "Добрый день",
    greetingEvening: "Добрый вечер",
    cashOnHand: "Свободные средства",
    seeAllActivity: "Все операции",
    availableBalance: "Сальдо журнала",
    balanceHint: "Доходы минус расходы по всем записям. Не остаток на счёте и не учитывает долг по кредитке.",
    inThisMonth: "Поступило в месяце",
    outThisMonth: "Списано в месяце",
    spendByCategory: "Расходы по категориям",
    chartAria: "Расходы по категориям",
    chartOutflow: "Расход",
    chartCategories: "{count} категорий в этом месяце",
    chartNoSpend: "В этом месяце расходов нет",
    lastSevenDays: "Последние 7 дней",
    dailyOutflow: "Ежедневные траты",
    recentActivity: "Недавние операции",
    openLedger: "Открыть журнал",
    ledgerEyebrow: "Журнал",
    activityTitle: "Операции",
    addEntry: "Добавить запись",
    searchLabel: "Поиск по месту или заметке",
    searchPlaceholder: "Поиск по месту или заметке",
    emptyState: "Нет записей по этому фильтру.",
    composeTitle: "Новая запись",
    close: "Закрыть",
    merchant: "Место",
    merchantPlaceholder: "Кофейня",
    note: "Заметка",
    notePlaceholder: "Необязательно",
    amount: "Сумма",
    amountPlaceholder: "2400",
    type: "Тип",
    typeExpense: "Расход",
    typeIncome: "Доход",
    category: "Категория",
    date: "Дата",
    saveEntry: "Сохранить",
    importStatement: "Импорт выписки",
    importTitle: "Импорт выписки",
    importChoose: "Выберите файл Excel (.xlsx) из банка",
    importHint: "Поддерживается выписка Альфа-Банка. Переводы между своими счетами импортируются — они нужны для правильного сальдо.",
    importSummary: "{selected} из {total} операций · {from} — {to}",
    importSummaryEmpty: "Операций для импорта не найдено",
    importDuplicates: "Дубликатов: {count}",
    importSkipInternal: "Перевод между счетами",
    importDuplicate: "Уже в журнале",
    importConfirm: "Импортировать выбранные",
    importParsing: "Разбор файла…",
    importSaving: "Сохранение…",
    importDone: "Импортировано операций: {count}",
    importNoFile: "Файл не выбран",
    importBadType: "Нужен файл .xlsx, .xls или .csv",
    importNoXlsx: "Не удалось загрузить библиотеку Excel",
    importUnsupported: "Формат выписки не распознан",
    importNoHeader: "Не найдена таблица операций",
    importEmpty: "В файле нет операций",
    importFailed: "Не удалось импортировать выписку",
    importSelectAll: "Выбрать все новые",
    importClearAll: "Снять выбор",
    deleteAllTest: "Тест: удалить все",
    deleteAllConfirm: "Удалить все операции в журнале «{journal}»? Это нельзя отменить.",
    deleteAllFailed: "Не удалось удалить операции.",
    remove: "Удалить",
    syncLoading: "Загрузка данных…",
    syncConfig: "Добавьте URL и anon key Supabase в config.js и запушьте на GitHub.",
    syncError: "Ошибка Supabase. Проверьте config.js и SQL-схему в supabase/schema.sql.",
    syncSaveError: "Не удалось сохранить. Попробуйте ещё раз.",
    monthSwitchLabel: "Выбор месяца",
    previousMonth: "Предыдущий месяц",
    nextMonth: "Следующий месяц",
    currentMonth: "Текущий месяц",
    goToCurrentMonth: "Текущий месяц",
    onlySelectedMonth: "Только этот месяц",
    authTitle: "Folio",
    signUpTitle: "Новый аккаунт",
    authCopy: "",
    email: "Почта",
    password: "Пароль",
    signIn: "Войти",
    signUp: "Создать аккаунт",
    signOut: "Выйти",
    needAccount: "Создать аккаунт",
    haveAccount: "Войти",
    journalLabel: "Журнал",
    changePassword: "Сменить пароль",
    passwordSheetTitle: "Сменить пароль",
    newPassword: "Новый пароль",
    confirmPassword: "Повторите пароль",
    savePassword: "Сохранить",
    passwordChanged: "Пароль изменён.",
    passwordMismatch: "Пароли не совпадают.",
    passwordChangeFailed: "Не удалось сменить пароль.",
    authFailed: "Не удалось войти. Проверьте почту и пароль.",
    authConfirmEmail: "Аккаунт создан. Если вход не открылся, подтвердите почту в письме от Supabase.",
    authHouseholdFull: "В журнале уже двое.",
    authAlreadyIn: "Этот аккаунт уже в журнале.",
    categories: {
      all: "Все",
      groceries: "Продукты",
      dining: "Еда вне дома",
      transit: "Транспорт",
      transfers: "Переводы",
      cash: "Снятие наличных",
      travel: "Поездки",
      communications: "Связь",
      shopping: "Покупки",
      services: "Сервисы",
      rent: "Аренда",
      utilities: "Коммуналка",
      health: "Здоровье",
      income: "Доход",
      other: "Другое",
    },
};

const CATEGORY_COLORS = {
  groceries: "#2f5d3a",
  dining: "#b85c38",
  transit: "#3d5a80",
  transfers: "#5b6d8a",
  cash: "#8d6e63",
  travel: "#7d5f8c",
  communications: "#4a718f",
  shopping: "#c07b3b",
  services: "#8b6f47",
  rent: "#6b4f3a",
  utilities: "#c4a574",
  health: "#7a4e7c",
  income: "#4c7c59",
  other: "#8a8175",
};

const CATEGORY_IDS = Object.keys(CATEGORY_COLORS);

const LEGACY_CATEGORY_MAP = {
  All: "all",
  Groceries: "groceries",
  Dining: "dining",
  Transit: "transit",
  Transfers: "transfers",
  Cash: "cash",
  Travel: "travel",
  Communications: "communications",
  Shopping: "shopping",
  Services: "services",
  Rent: "rent",
  Utilities: "utilities",
  Health: "health",
  Income: "income",
  Other: "other",
};

function t(key, params = {}) {
  const parts = key.split(".");
  let value = MESSAGES;
  for (const part of parts) {
    value = value?.[part];
  }
  if (value == null) return key;
  return String(value).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
}

function categoryLabel(id) {
  if (id === "all") return t("categories.all");
  return t(`categories.${id}`) || id;
}

function normalizeCategory(value) {
  if (!value) return "other";
  if (CATEGORY_COLORS[value]) return value;
  return LEGACY_CATEGORY_MAP[value] || "other";
}

function formatMoney(amount) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatShortDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("ru-RU", {
    month: "short",
    day: "numeric",
  });
}

function formatMonthYear(ym) {
  const [year, month] = ym.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
}

function formatWeekdayNarrow(date) {
  return date.toLocaleDateString("ru-RU", { weekday: "narrow" });
}

function greetingForHour(hour = new Date().getHours()) {
  if (hour < 12) return t("greetingMorning");
  if (hour < 18) return t("greetingAfternoon");
  return t("greetingEvening");
}

function applyI18n() {
  document.title = t("appTitle");

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    const params = node.dataset.i18nParams ? JSON.parse(node.dataset.i18nParams) : {};
    node.textContent = t(key, params);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  });

  const greeting = document.getElementById("greeting");
  if (greeting) greeting.textContent = greetingForHour();

  const donutLabel = document.getElementById("donut-label");
  if (donutLabel) donutLabel.textContent = t("chartOutflow");

  const search = document.getElementById("search");
  if (search) search.placeholder = t("searchPlaceholder");

  const donut = document.getElementById("donut");
  if (donut) donut.setAttribute("aria-label", t("chartAria"));

  const categorySelect = document.querySelector('select[name="category"]');
  if (categorySelect) {
    categorySelect.innerHTML = CATEGORY_IDS.filter((id) => id !== "income")
      .map((id) => `<option value="${id}">${categoryLabel(id)}</option>`)
      .join("");
  }

  const kindSelect = document.querySelector('select[name="kind"]');
  if (kindSelect) {
    kindSelect.innerHTML = `
      <option value="expense">${t("typeExpense")}</option>
      <option value="income">${t("typeIncome")}</option>`;
  }

}

window.i18n = {
  CATEGORY_COLORS,
  CATEGORY_IDS,
  t,
  categoryLabel,
  normalizeCategory,
  formatMoney,
  formatShortDate,
  formatMonthYear,
  formatWeekdayNarrow,
  greetingForHour,
  applyI18n,
};

document.documentElement.lang = "ru";
applyI18n();
