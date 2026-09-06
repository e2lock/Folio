const MESSAGES = {
    appTitle: "Folio — личный учёт",
    brandSubtitle: "Журнал за {month}",
    railFoot: "Два журнала: Егор и Надежда. Данные только после входа.",
    navOverview: "Обзор",
    navActivity: "Операции",
    navPlanner: "Планировщик",
    ariaOverview: "Обзор",
    ariaActivity: "Операции",
    ariaPlanner: "Планировщик",
    ariaMenu: "Главное меню",
    ariaCloseMenu: "Закрыть меню",
    menuTitle: "Меню",
    openMenu: "Меню",
    greetingMorning: "Доброе утро",
    greetingAfternoon: "Добрый день",
    greetingEvening: "Добрый вечер",
    cashOnHand: "Свободные средства",
    seeAllActivity: "Все операции",
    availableBalance: "Остаток на счетах",
    balanceHint: "Начальный остаток счетов плюс все операции журнала.",
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
    importChoose: "Выберите файл выписки (.xlsx, .pdf)",
    importHint: "Поддерживаются выписки Альфа-Банка (.xlsx) и СберБанка (.pdf). Переводы между своими счетами импортируются — они нужны для правильного сальдо.",
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
    importBadType: "Нужен файл .xlsx, .xls, .csv или .pdf",
    importNoXlsx: "Не удалось загрузить библиотеку Excel",
    importNoPdfLib: "Не удалось загрузить библиотеку PDF",
    importUnsupported: "Формат выписки не распознан",
    importNoHeader: "Не найдена таблица операций",
    importEmpty: "В файле нет операций",
    importFailed: "Не удалось импортировать выписку",
    bankSber: "СберБанк",
    bankAlfa: "Альфа-Банк",
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
    monthSwitchLabel: "Выбор периода",
    periodPickerTitle: "Период",
    periodCurrentMonth: "Текущий месяц",
    periodThreeMonths: "3 месяца",
    periodCustom: "Свой период",
    periodFrom: "С",
    periodTo: "По",
    periodApply: "Применить",
    periodSelectMonth: "Или выберите месяц",
    periodThreeMonthsLabel: "{from} — {to}",
    periodRangeLabel: "{from} — {to}",
    inThisPeriod: "Поступило за период",
    outThisPeriod: "Списано за период",
    onlySelectedPeriod: "Только выбранный период",
    chartCategoriesPeriod: "{count} категорий за период",
    chartNoSpendPeriod: "За выбранный период расходов нет",
    analyticsSubtitlePeriod: "Анализ утечек и структуры трат за {period}",
    insightsNoDataPeriod: "Недостаточно данных за выбранный период.",
    brandSubtitlePeriod: "Журнал за {period}",
    previousMonth: "Предыдущий месяц",
    nextMonth: "Следующий месяц",
    currentMonth: "Текущий месяц",
    goToCurrentMonth: "Текущий месяц",
    onlySelectedMonth: "Только выбранный период",
    analyticsTitle: "Куда уходят деньги",
    analyticsSubtitle: "Анализ утечек и структуры трат за {month}",
    insightsBurnTitle: "Темп сгорания",
    insightsBurnPerDay: "{amount} / день",
    insightsBurnHint: "В среднем в сутки в этом месяце (траты без переводов)",
    insightsTopEatersTitle: "Главные пожиратели бюджета",
    insightsTopEatersHint: "Места, которые забрали больше всего денег за месяц",
    insightsSmallLeaksTitle: "Мелкие незаметные утечки",
    insightsSmallLeaksHint: "Операции до 1 000 ₽ суммарно: {total} ({count} раз)",
    insightsRecurringTitle: "Подписки и регулярные платежи",
    insightsRecurringHint: "Связь, хостинг, сервисы и повторяющиеся списания",
    insightsAtmTitle: "Наличные на руках",
    insightsAtmHint: "Снято в банкоматах: {amount} ({count} раз)",
    insightsNoData: "Недостаточно данных для анализа за этот месяц.",
    insightsViewTx: "Найти в операциях",

    /* Планировщик и аналитика бюджета */
    plannerTitle: "Планировщик бюджета",
    plannerSubtitle: "Контроль текущего баланса, ожидаемых доходов и будущих списаний",
    accountsLabel: "Счета",
    accountLabel: "Счёт",
    accountDefaultName: "Основной счёт",
    accountNamePlaceholder: "Сбер, наличные...",
    accountCardPlaceholder: "Остаток на карте",
    accountCardBalance: "Остаток на карте",
    accountAdd: "Добавить счёт",
    accountRemove: "Удалить счёт",
    importAccount: "Зачислить на счёт",
    currentBalanceHint: "Остаток счетов с учётом начального остатка",
    currentBalanceCard: "Текущий баланс",
    upcomingExpensesCard: "Грядущие расходы",
    expectedIncomeCard: "Ожидаемые поступления",
    projectedRemainderCard: "Итоговый остаток",
    projectedRemainderHint: "Сколько останется от текущего счёта после всех плановых списаний и поступлений",
    walletWeatherEyebrow: "Погода кошелька",
    weatherClear: "Ясный день",
    weatherHaze: "Дымка",
    weatherDrizzle: "Морось",
    weatherWind: "Ветрено",
    weatherStorm: "Шторм",
    weatherClearText: "Темп трат не съедает остаток раньше конца периода. Можно дышать.",
    weatherHazeText: "Мелочи и выходные размывают картину: денег уходит больше, чем кажется.",
    weatherDrizzleText: "При таком темпе к концу периода остаток станет тонким. Имеет смысл заранее отметить обязательные платежи.",
    weatherWindText: "Этот отрезок заметно дороже предыдущего. Посмотрите, что раздулось.",
    weatherStormText: "После плановых списаний остаток уходит в минус или темп уже выше запаса дней.",
    handSteady: "Почерк ровный: траты распределены без резкого крена.",
    handWeekend: "Почерк выходного: больше половины уходит в субботу и воскресенье.",
    handRitual: "Почерк ритуала: одни и те же места забирают почти половину.",
    handImpulse: "Почерк вспышек: много разовых точек, мало повторяющихся привычек.",
    handFrontloaded: "Почерк старта: первая половина периода заметно прожорливее второй.",
    handCity: "Почерк города: кафе, доставка и поездки задают тон.",
    weatherVsPrevUp: "на {pct}% дороже прошлого такого же отрезка",
    weatherVsPrevDown: "на {pct}% спокойнее прошлого отрезка",
    weatherVsPrevFlat: "почти как в прошлом таком же отрезке",
    weatherVsPrevNew: "сравнивать пока не с чем",
    weatherHabitSplit: "повторяющиеся места {habit} · разовые {impulse}",
    weatherRunway: "при этом темпе остатка хватит примерно на {days} дн.",
    spendPortraitTitle: "Как уходят деньги по дням",
    spendPortraitHint: "В какие дни недели больше тратите и что повторяется",
    weekdayRhythm: "По дням недели",
    splitEarlyLate: "Начало / конец периода",
    splitHabitImpulse: "Одни и те же места / разовые",
    splitWeekend: "Будни / выходные",
    splitEarly: "Первая половина",
    splitLate: "Вторая половина",
    splitHabit: "3+ визита",
    splitImpulse: "Разовые",
    splitWeekday: "Будни",
    splitWeekendLabel: "Выходные",
    tipOpenCategory: "Смотреть операции",
    tipSaveChip: "можно срезать ~{amount}",
    helpAria: "Что это значит",
    insightsVsPrevTitle: "Сравнение с прошлым периодом",
    insightsVsPrevHelp: "Берём выбранный период и столько же дней сразу перед ним. Сентябрь сравнивается не с «августом как месяцем», а с таким же числом дней до 1 сентября. Считаются только траты, без переводов.",
    insightsVsPrevUp: "Траты выросли на {pct}% ({amount})",
    insightsVsPrevDown: "Траты сжались на {pct}% ({amount})",
    insightsVsPrevFlat: "Почти как в прошлом таком же отрезке",
    insightsWeekendTitle: "Траты в выходные",
    insightsWeekendHint: "Суббота и воскресенье забрали {pct}% расходов",
    insightsWeekendHelp: "Доля всех трат периода, которая пришлась на субботу и воскресенье. Если больше трети — выходные заметно раздувают месяц.",
    insightsHabitTitle: "Повторяющиеся места",
    insightsHabitHint: "Куда ходили 3 и больше раз: {amount} ({pct}%)",
    insightsHabitHelp: "Сумма трат в точках, где было минимум 3 операции за период. Это не «сила характера», а Яндекс Go, Перекрёсток и прочие привычные места. Разовая покупка сюда не входит.",
    insightsBurnHelp: "Все траты периода без переводов, делённые на уже прошедшие дни. Это средний расход в сутки, не прогноз счёта.",
    weatherHelp: "Короткий диагноз периода: хватает ли остатка при текущем темпе, не раздулись ли мелочи и выходные, не ушли ли траты сильно вверх относительно прошлого такого же куска дней.",
    portraitHelp: "Столбики — сумма трат по дням недели. Полоски справа делят период пополам, отделяют повторяющиеся места от разовых визитов и будни от выходных.",
    weatherCompareLabel: "С прошлым периодом",
    weatherMixLabel: "Привычные и разовые",
    weatherRunwayLabel: "На сколько дней остатка",
    savingsTipsTitle: "Где можно сократить расходы",
    savingsTipsHint: "Не советы «вообще», а рычаги именно этого периода",
    frequentExpensesTitle: "Самые частые траты",
    frequentExpensesHint: "Привычки, а не разовые крупные покупки",
    upcomingListTitle: "Запланированные операции",
    addPlannedItem: "Запланировать трату / доход",
    plannedName: "Название или контрагент",
    plannedNamePlaceholder: "Аренда, интернет, подписка...",
    plannedAmount: "Сумма",
    plannedAmountPlaceholder: "5000",
    plannedDate: "Срок или дата",
    plannedType: "Тип",
    plannedCategory: "Категория",
    plannedSubcategory: "Подкатегория",
    savePlanned: "Добавить в план",
    removePlanned: "Удалить",
    markPlannedDone: "Выполнено",
    noPlannedItems: "Пока нет запланированных расходов. Добавьте обязательные платежи до конца месяца.",
    subcategoriesLabel: "Подкатегория",
    allSubcategories: "Все подкатегории",
    runwayDays: "Хватит на ~{days} дн.",
    runwaySafe: "Баланс стабилен",
    runwayWarning: "Риск дефицита к концу месяца",
    tipSubscriptions: "Подписки и сервисы составляют {amount}. Проверьте автопродления, которыми редко пользуетесь.",
    tipDeliveryDining: "Доставка и кафе забирают {amount} ({count} раз). Сокращение походов на 20% сэкономит ~{saving}.",
    tipSmallLeaks: "Мелкие траты до 1 000 ₽ незаметно уносят {amount}. Установите дневной лимит на перекусы и кофе.",
    tipGroceries: "Продукты и супермаркеты: {amount}. Составление списка перед покупками сохраняет до 15% бюджета.",
    tipTaxi: "Поездки на такси и самокатах: {amount}. Для коротких дистанций можно чаще выбирать метро/пешком.",
    tipHealthyBudget: "Траты распределены сбалансированно, критических перекосов не обнаружено.",

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

const SUBCATEGORIES = {
  groceries: [
    { id: "supermarket", label: "Супермаркеты и гипермаркеты" },
    { id: "delivery_food", label: "Доставка продуктов (Самокат, Лавка, EdaRit)" },
    { id: "specialty_food", label: "Специализированные (ВкусВилл, фермерские)" },
    { id: "beverages_alcohol", label: "Напитки и винмаркеты" },
  ],
  dining: [
    { id: "restaurant_delivery", label: "Доставка из ресторанов (Yandex Eda)" },
    { id: "cafes_coffee", label: "Кофейни и пекарни" },
    { id: "fastfood", label: "Фастфуд и бургерные" },
    { id: "restaurants_bars", label: "Рестораны и бары" },
    { id: "business_lunch", label: "Обеды и столовые" },
  ],
  transit: [
    { id: "taxi", label: "Такси (Yandex Go и др.)" },
    { id: "public_transport", label: "Метро, автобусы, троллейбусы" },
    { id: "suburban_trains", label: "Электрички и пригородные поезда" },
    { id: "kicksharing", label: "Кикшеринг (Самокаты)" },
    { id: "carsharing_gas", label: "Каршеринг и АЗС" },
  ],
  communications: [
    { id: "mobile_phone", label: "Мобильная связь (Билайн, МТС, Мегафон)" },
    { id: "home_internet_tv", label: "Домашний интернет и ТВ (Ростелеком)" },
    { id: "hosting_domains", label: "Хостинг и доменные имена" },
  ],
  utilities: [
    { id: "housing_maintenance", label: "ЖКХ, квартплата, ЕИРЦ" },
    { id: "electricity_gas", label: "Электроэнергия и газ" },
    { id: "intercom_security", label: "Домофон, охрана, консьерж" },
  ],
  services: [
    { id: "digital_subs", label: "Цифровые подписки и стриминг" },
    { id: "banking_fees", label: "Банковские комиссии и уведомления" },
    { id: "household_repairs", label: "Бытовые услуги, химчистка, ремонт" },
    { id: "beauty_hair", label: "Парикмахерские и барбершопы" },
  ],
  shopping: [
    { id: "marketplaces", label: "Маркетплейсы (Ozon, Wildberries)" },
    { id: "clothing_shoes", label: "Одежда и обувь" },
    { id: "electronics_gadgets", label: "Электроника и техника" },
    { id: "home_goods", label: "Товары для дома и уюта" },
  ],
  health: [
    { id: "pharmacy", label: "Аптеки и лекарства" },
    { id: "clinics_dentistry", label: "Клиники, анализы, стоматология" },
    { id: "optics_fitness", label: "Оптика, спорт, витамины" },
  ],
  travel: [
    { id: "train_tickets", label: "Поезда и ЖД билеты (РЖД)" },
    { id: "air_tickets", label: "Авиабилеты" },
    { id: "hotels_tours", label: "Отели, бронирования, туры" },
  ],
  cash: [
    { id: "atm_withdrawal", label: "Снятие в банкомате" },
    { id: "cash_deposit", label: "Внесение наличных" },
  ],
  transfers: [
    { id: "sbp_transfer", label: "Переводы через СБП" },
    { id: "card_to_card", label: "Переводы по карте / внутри банка" },
    { id: "internal_accounts", label: "Между своими счетами" },
  ],
  rent: [
    { id: "apartment_rent", label: "Аренда квартиры / жилья" },
    { id: "parking_storage", label: "Паркинг или кладовка" },
  ],
  income: [
    { id: "salary", label: "Заработная плата и аванс" },
    { id: "freelance_business", label: "Фриланс / гонорары / бизнес" },
    { id: "cashback_interest", label: "Кэшбэк и проценты по остатку" },
    { id: "refunds", label: "Возвраты покупок" },
    { id: "other_income", label: "Прочие поступления" },
  ],
  other: [
    { id: "misc_spend", label: "Разные мелкие расходы" },
    { id: "uncategorized", label: "Без точной категории" },
  ],
};

function subcategoryLabel(catId, subId) {
  if (!subId) return "";
  const list = SUBCATEGORIES[catId];
  if (list) {
    const found = list.find((s) => s.id === subId);
    if (found) return found.label;
  }
  for (const cat of Object.keys(SUBCATEGORIES)) {
    const found = SUBCATEGORIES[cat].find((s) => s.id === subId);
    if (found) return found.label;
  }
  return subId;
}

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

  const categorySelects = document.querySelectorAll('select[name="category"]');
  categorySelects.forEach((sel) => {
    sel.innerHTML = CATEGORY_IDS.filter((id) => id !== "income")
      .map((id) => `<option value="${id}">${categoryLabel(id)}</option>`)
      .join("");
  });

  const kindSelects = document.querySelectorAll('select[name="kind"]');
  kindSelects.forEach((sel) => {
    sel.innerHTML = `
      <option value="expense">${t("typeExpense")}</option>
      <option value="income">${t("typeIncome")}</option>`;
  });

}

window.i18n = {
  CATEGORY_COLORS,
  CATEGORY_IDS,
  SUBCATEGORIES,
  subcategoryLabel,
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
