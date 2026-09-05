const LOCALE_KEY = "folio-locale-v1";

const MESSAGES = {
  ru: {
    appTitle: "Folio — личный учёт",
    brandSubtitle: "Журнал за сентябрь",
    railFoot: "Журнал только для двоих. Без входа данные закрыты.",
    navOverview: "Обзор",
    navActivity: "Операции",
    ariaOverview: "Обзор",
    ariaActivity: "Операции",
    greetingMorning: "Доброе утро",
    greetingAfternoon: "Добрый день",
    greetingEvening: "Добрый вечер",
    cashOnHand: "Свободные средства",
    seeAllActivity: "Все операции",
    availableBalance: "Доступный баланс",
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
    remove: "Удалить",
    syncLoading: "Загрузка данных…",
    syncConfig: "Добавьте URL и anon key Supabase в config.js и запушьте на GitHub.",
    syncError: "Ошибка Supabase. Проверьте config.js и SQL-схему в supabase/schema.sql.",
    syncSaveError: "Не удалось сохранить. Попробуйте ещё раз.",
    langRu: "RU",
    langEn: "EN",
    languageGroup: "Язык",
    authTitle: "Вход в Folio",
    signUpTitle: "Создать аккаунт",
    authCopy: "Два аккаунта, один журнал. Без входа чужие данные недоступны.",
    householdTitle: "Семейный журнал",
    householdCopy: "Первый создаёт журнал и даёт код второму. Больше двух человек нельзя.",
    email: "Почта",
    password: "Пароль",
    signIn: "Войти",
    signUp: "Создать аккаунт",
    signOut: "Выйти",
    needAccount: "Нет аккаунта? Создать",
    haveAccount: "Уже есть аккаунт? Войти",
    createHousehold: "Создать журнал",
    orJoin: "или войти по коду второго человека",
    inviteCode: "Код приглашения",
    invitePlaceholder: "ABCD1234",
    joinHousehold: "Присоединиться",
    inviteLine: "Код для второго: {code}",
    authFailed: "Не удалось войти. Проверьте почту и пароль.",
    authConfirmEmail: "Аккаунт создан. Если вход не открылся, подтвердите почту в письме от Supabase.",
    authInvalidCode: "Код не найден. Проверьте написание.",
    authHouseholdFull: "В этом журнале уже двое.",
    authAlreadyIn: "Этот аккаунт уже в журнале.",
    categories: {
      all: "Все",
      groceries: "Продукты",
      dining: "Еда вне дома",
      transit: "Транспорт",
      rent: "Аренда",
      utilities: "Коммуналка",
      health: "Здоровье",
      income: "Доход",
      other: "Другое",
    },
  },
  en: {
    appTitle: "Folio — personal ledger",
    brandSubtitle: "September ledger",
    railFoot: "A private ledger for two. Sign in to see any data.",
    navOverview: "Overview",
    navActivity: "Activity",
    ariaOverview: "Overview",
    ariaActivity: "Activity",
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    cashOnHand: "Cash on hand",
    seeAllActivity: "See all activity",
    availableBalance: "Available balance",
    inThisMonth: "In this month",
    outThisMonth: "Out this month",
    spendByCategory: "Spend by category",
    chartAria: "Spending by category",
    chartOutflow: "Outflow",
    chartCategories: "{count} categories this month",
    chartNoSpend: "No spend this month",
    lastSevenDays: "Last seven days",
    dailyOutflow: "Daily outflow",
    recentActivity: "Recent activity",
    openLedger: "Open ledger",
    ledgerEyebrow: "Ledger",
    activityTitle: "Activity",
    addEntry: "Add entry",
    searchLabel: "Search merchant or note",
    searchPlaceholder: "Search merchant or note",
    emptyState: "No entries match this filter.",
    composeTitle: "New entry",
    close: "Close",
    merchant: "Merchant",
    merchantPlaceholder: "Blue Bottle",
    note: "Note",
    notePlaceholder: "Optional",
    amount: "Amount",
    amountPlaceholder: "24.00",
    type: "Type",
    typeExpense: "Expense",
    typeIncome: "Income",
    category: "Category",
    date: "Date",
    saveEntry: "Save to ledger",
    remove: "Remove",
    syncLoading: "Loading data…",
    syncConfig: "Add your Supabase URL and anon key to config.js, then push to GitHub.",
    syncError: "Supabase error. Check config.js and supabase/schema.sql.",
    syncSaveError: "Could not save. Please try again.",
    langRu: "RU",
    langEn: "EN",
    languageGroup: "Language",
    authTitle: "Sign in to Folio",
    signUpTitle: "Create an account",
    authCopy: "Two accounts, one ledger. Nothing is readable without a login.",
    householdTitle: "Household ledger",
    householdCopy: "The first person creates the ledger and shares the code. Two people only.",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    signUp: "Create account",
    signOut: "Sign out",
    needAccount: "Need an account? Sign up",
    haveAccount: "Already have an account? Sign in",
    createHousehold: "Create ledger",
    orJoin: "or join with the other person's code",
    inviteCode: "Invite code",
    invitePlaceholder: "ABCD1234",
    joinHousehold: "Join",
    inviteLine: "Invite code: {code}",
    authFailed: "Could not sign in. Check email and password.",
    authConfirmEmail: "Account created. If you stay locked out, confirm the email from Supabase.",
    authInvalidCode: "That invite code was not found.",
    authHouseholdFull: "This ledger already has two people.",
    authAlreadyIn: "This account is already in a ledger.",
    categories: {
      all: "All",
      groceries: "Groceries",
      dining: "Dining",
      transit: "Transit",
      rent: "Rent",
      utilities: "Utilities",
      health: "Health",
      income: "Income",
      other: "Other",
    },
  },
};

const CATEGORY_COLORS = {
  groceries: "#2f5d3a",
  dining: "#b85c38",
  transit: "#3d5a80",
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
  Rent: "rent",
  Utilities: "utilities",
  Health: "health",
  Income: "income",
  Other: "other",
};

let locale = resolveLocale();

function resolveLocale() {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved && MESSAGES[saved]) return saved;
  } catch {
    /* ignore */
  }
  return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "ru";
}

function setLocale(next) {
  if (!MESSAGES[next]) return;
  locale = next;
  try {
    localStorage.setItem(LOCALE_KEY, next);
  } catch {
    /* ignore */
  }
  document.documentElement.lang = next;
  applyI18n();
  if (typeof window.onLocaleChange === "function") window.onLocaleChange();
}

function getLocale() {
  return locale;
}

function t(key, params = {}) {
  const parts = key.split(".");
  let value = MESSAGES[locale];
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
  const currency = locale === "ru" ? "RUB" : "USD";
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatShortDate(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatWeekdayNarrow(date) {
  return date.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-US", { weekday: "narrow" });
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

  document.querySelectorAll("[data-locale]").forEach((btn) => {
    btn.classList.toggle("is-on", btn.dataset.locale === locale);
  });
}

window.i18n = {
  LOCALE_KEY,
  CATEGORY_COLORS,
  CATEGORY_IDS,
  getLocale,
  setLocale,
  t,
  categoryLabel,
  normalizeCategory,
  formatMoney,
  formatShortDate,
  formatWeekdayNarrow,
  greetingForHour,
  applyI18n,
};

document.documentElement.lang = locale;
applyI18n();
