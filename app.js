const state = {
  view: "overview",
  query: "",
  category: "all",
  periodMode: "month",
  selectedMonth: thisMonth(),
  periodFrom: "",
  periodTo: "",
  periodOpen: false,
  activityMonthOnly: true,
  items: [],
  accounts: [],
  plannedItems: [],
  loading: true,
  syncError: null,
  session: null,
  household: null,
  journals: [],
  membershipRole: null,
  authMode: "signin",
  authError: null,
  passwordError: null,
  importPreview: null,
  importError: null,
  importBusy: false,
  drawerOpen: false,
};

function normalizeItem(item) {
  return {
    ...item,
    category: i18n.normalizeCategory(item.category),
    subcategory: item.subcategory || null,
    accountId: item.accountId || null,
  };
}

function monthKey(iso) {
  return iso.slice(0, 7);
}

function thisMonth() {
  return isoLocal(new Date()).slice(0, 7);
}

function shiftMonth(ym, delta) {
  const [year, month] = ym.split("-").map(Number);
  const next = new Date(year, month - 1 + delta, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function isCurrentMonth(ym) {
  return ym === thisMonth();
}

function monthStart(ym) {
  return `${ym}-01`;
}

function monthEnd(ym) {
  const [year, month] = ym.split("-").map(Number);
  const day = new Date(year, month, 0).getDate();
  return `${ym}-${String(day).padStart(2, "0")}`;
}

function getPeriodBounds() {
  if (state.periodMode === "3months") {
    const anchor = state.selectedMonth || thisMonth();
    const startYm = shiftMonth(anchor, -2);
    return { from: monthStart(startYm), to: monthEnd(anchor) };
  }
  if (state.periodMode === "range") {
    const from = state.periodFrom || monthStart(thisMonth());
    let to = state.periodTo || isoLocal(new Date());
    if (from > to) to = from;
    return { from, to };
  }
  return { from: monthStart(state.selectedMonth), to: monthEnd(state.selectedMonth) };
}

function getPeriodLabel() {
  if (state.periodMode === "month") {
    return i18n.formatMonthYear(state.selectedMonth);
  }
  if (state.periodMode === "3months") {
    const anchor = state.selectedMonth || thisMonth();
    const startYm = shiftMonth(anchor, -2);
    if (startYm === anchor) return i18n.formatMonthYear(anchor);
    return i18n.t("periodThreeMonthsLabel", {
      from: i18n.formatMonthYear(startYm),
      to: i18n.formatMonthYear(anchor),
    });
  }
  const bounds = getPeriodBounds();
  return i18n.t("periodRangeLabel", {
    from: i18n.formatShortDate(bounds.from),
    to: i18n.formatShortDate(bounds.to),
  });
}

function itemInPeriod(item) {
  const { from, to } = getPeriodBounds();
  return item.date >= from && item.date <= to;
}

function periodItems() {
  return state.items.filter(itemInPeriod);
}

function listRecentMonths(count = 24) {
  const months = [];
  let ym = thisMonth();
  for (let i = 0; i < count; i += 1) {
    months.push(ym);
    ym = shiftMonth(ym, -1);
  }
  return months;
}

const MONTH_PREFS_STORAGE = "folio-month-prefs-v1";

function isValidMonth(ym) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(ym || ""));
}

function loadMonthPrefs() {
  try {
    const raw = localStorage.getItem(MONTH_PREFS_STORAGE);
    if (!raw) {
      return {
        periodMode: "month",
        selectedMonth: thisMonth(),
        periodFrom: "",
        periodTo: "",
        activityMonthOnly: true,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      periodMode: parsed.periodMode || "month",
      selectedMonth: isValidMonth(parsed.selectedMonth) ? parsed.selectedMonth : thisMonth(),
      periodFrom: parsed.periodFrom || "",
      periodTo: parsed.periodTo || "",
      activityMonthOnly: parsed.activityMonthOnly !== false,
    };
  } catch {
    return {
      periodMode: "month",
      selectedMonth: thisMonth(),
      periodFrom: "",
      periodTo: "",
      activityMonthOnly: true,
    };
  }
}

function persistMonthPrefs() {
  try {
    localStorage.setItem(
      MONTH_PREFS_STORAGE,
      JSON.stringify({
        periodMode: state.periodMode,
        selectedMonth: state.selectedMonth,
        periodFrom: state.periodFrom,
        periodTo: state.periodTo,
        activityMonthOnly: state.activityMonthOnly,
      })
    );
  } catch {
    /* ignore */
  }
}

Object.assign(state, loadMonthPrefs());

function signed(item) {
  return item.kind === "income" ? item.amount : -item.amount;
}

function defaultAccount() {
  return state.accounts.find((account) => account.isDefault) || state.accounts[0] || null;
}

function itemBelongsToAccount(item, account) {
  if (!account) return false;
  if (item.accountId) return item.accountId === account.id;
  return Boolean(account.isDefault);
}

function openingTotal() {
  return state.accounts.reduce((sum, account) => sum + Number(account.openingBalance || 0), 0);
}

function signedForAccount(account) {
  return state.items
    .filter((item) => itemBelongsToAccount(item, account))
    .reduce((sum, item) => sum + signed(item), 0);
}

function accountRemainder(account) {
  return Number(account.openingBalance || 0) + signedForAccount(account);
}

function openingFromStated(account, stated) {
  return Number(stated) - signedForAccount(account);
}

function totals() {
  const balance = openingTotal() + state.items.reduce((sum, item) => sum + signed(item), 0);
  const scopedItems = periodItems();
  const spendable = scopedItems.filter((i) => i.category !== "transfers");
  const income = spendable.filter((i) => i.kind === "income").reduce((s, i) => s + i.amount, 0);
  const spend = spendable.filter((i) => i.kind === "expense").reduce((s, i) => s + i.amount, 0);
  return { balance, income, spend, monthItems: scopedItems };
}

function categorySpend() {
  const map = {};
  totals().monthItems
    .filter((item) => item.kind === "expense" && item.category !== "transfers")
    .forEach((item) => {
      map[item.category] = (map[item.category] || 0) + item.amount;
    });
  return Object.entries(map)
    .map(([id, value]) => ({
      id,
      value,
      color: i18n.CATEGORY_COLORS[id] || i18n.CATEGORY_COLORS.other,
    }))
    .sort((a, b) => b.value - a.value);
}

function isoLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lastSeven() {
  const days = [];
  const bounds = getPeriodBounds();
  const todayIso = isoLocal(new Date());
  const anchorIso = bounds.to <= todayIso ? bounds.to : todayIso;
  const anchor = new Date(`${anchorIso}T12:00:00`);
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    const iso = isoLocal(d);
    const spend = state.items
      .filter((item) => item.date === iso && item.kind === "expense" && item.category !== "transfers")
      .reduce((s, item) => s + item.amount, 0);
    days.push({
      iso,
      label: i18n.formatWeekdayNarrow(d),
      spend,
    });
  }
  return days;
}

function filteredItems() {
  return state.items
    .filter((item) => {
      const categoryLabel = i18n.categoryLabel(item.category);
      const hay = `${item.merchant} ${item.note} ${categoryLabel}`.toLowerCase();
      const q = state.query.toLowerCase().trim();
      const catOk = state.category === "all" || item.category === state.category;
      const periodOk = !state.activityMonthOnly || itemInPeriod(item);
      return catOk && periodOk && (!q || hay.includes(q));
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function renderPeriodChrome() {
  syncPeriodPopover();
  const periodText = getPeriodLabel();
  const subtitle = document.getElementById("brand-subtitle");
  if (subtitle) subtitle.textContent = i18n.t("brandSubtitlePeriod", { period: periodText });

  const label = document.getElementById("period-label");
  if (label) label.textContent = periodText;

  const monthOnly = document.getElementById("month-only");
  if (monthOnly) monthOnly.checked = state.activityMonthOnly;

  document.querySelectorAll(".period-preset").forEach((btn) => {
    const mode = btn.dataset.periodMode;
    let isActive = false;
    if (mode === "month" && btn.dataset.monthPreset === "current") {
      isActive = state.periodMode === "month" && isCurrentMonth(state.selectedMonth);
    } else if (mode === "3months") {
      isActive = state.periodMode === "3months";
    } else if (mode === "range") {
      isActive = state.periodMode === "range";
    }
    btn.classList.toggle("is-active", isActive);
  });

  const rangePanel = document.getElementById("period-range-panel");
  if (rangePanel) rangePanel.hidden = state.periodMode !== "range" || !state.periodOpen;

  const fromInput = document.getElementById("period-from");
  const toInput = document.getElementById("period-to");
  const bounds = getPeriodBounds();
  if (fromInput && !fromInput.matches(":focus")) fromInput.value = state.periodFrom || bounds.from;
  if (toInput && !toInput.matches(":focus")) toInput.value = state.periodTo || bounds.to;

  renderPeriodMonthGrid();
}

function renderPeriodMonthGrid() {
  const grid = document.getElementById("period-month-grid");
  if (!grid) return;

  const months = listRecentMonths(24);
  const txMonths = new Set(state.items.map((item) => monthKey(item.date)));

  grid.replaceChildren();
  months.forEach((ym) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "period-month-btn";
    btn.dataset.month = ym;
    const isSelected = state.periodMode === "month" && state.selectedMonth === ym;
    if (isSelected) btn.classList.add("is-active");
    if (txMonths.has(ym)) btn.classList.add("has-data");
    if (isCurrentMonth(ym)) btn.classList.add("is-current");

    const [year, month] = ym.split("-").map(Number);
    const monthName = new Date(year, month - 1, 1).toLocaleDateString("ru-RU", { month: "long" });
    btn.innerHTML = `
      <span class="period-month-name">${monthName.charAt(0).toUpperCase()}${monthName.slice(1)}</span>
      <span class="period-month-year">${year}</span>
    `;
    grid.appendChild(btn);
  });
}

function syncPeriodPopover() {
  const popover = document.getElementById("period-popover");
  const backdrop = document.getElementById("period-backdrop");
  const trigger = document.getElementById("period-trigger");
  if (popover) popover.hidden = !state.periodOpen;
  if (backdrop) backdrop.hidden = !state.periodOpen;
  if (trigger) trigger.setAttribute("aria-expanded", String(state.periodOpen));
}

function togglePeriodPopover(open) {
  state.periodOpen = typeof open === "boolean" ? open : !state.periodOpen;
  syncPeriodPopover();
  if (state.periodOpen) renderPeriodChrome();
}

function applyPeriodMode(mode, options = {}) {
  state.periodMode = mode;
  if (mode === "month") {
    if (options.month) state.selectedMonth = options.month;
    else if (options.currentMonth) state.selectedMonth = thisMonth();
  }
  if (mode === "3months") {
    state.selectedMonth = options.month || thisMonth();
  }
  if (mode === "range") {
    const bounds = getPeriodBounds();
    state.periodFrom = options.from || state.periodFrom || bounds.from;
    state.periodTo = options.to || state.periodTo || bounds.to;
  }
  persistMonthPrefs();
  render();
}

const PLANNED_STORAGE_KEY = "folio_planned_list";
const PLANNED_CLOUD_FLAG = "folio_planned_cloud_v1";

function loadLocalPlannedItems() {
  try {
    const hid = state.household?.id;
    const scoped = hid ? localStorage.getItem(`${PLANNED_STORAGE_KEY}:${hid}`) : null;
    const raw = scoped || localStorage.getItem(PLANNED_STORAGE_KEY) || localStorage.getItem("folio_planned_items_v1");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistPlannedItems() {
  try {
    const hid = state.household?.id;
    localStorage.setItem(PLANNED_STORAGE_KEY, JSON.stringify(state.plannedItems));
    if (hid) localStorage.setItem(`${PLANNED_STORAGE_KEY}:${hid}`, JSON.stringify(state.plannedItems));
  } catch {
    /* ignore */
  }
}

state.plannedItems = loadLocalPlannedItems();

function computePlannerMetrics() {
  const { balance } = totals();

  const relevantPlanned = state.plannedItems.filter((p) => {
    if (!p.date) return true;
    const { from, to } = getPeriodBounds();
    return p.date >= from && p.date <= to;
  });

  const upcomingExpenses = relevantPlanned
    .filter((p) => p.kind === "expense")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const expectedIncome = relevantPlanned
    .filter((p) => p.kind === "income")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const projectedRemainder = balance - upcomingExpenses + expectedIncome;

  return {
    currentBalance: balance,
    upcomingExpenses,
    expectedIncome,
    projectedRemainder,
    plannedList: relevantPlanned,
  };
}

function computeFrequentExpenses(monthItems) {
  const expenses = monthItems.filter((i) => i.kind === "expense" && i.category !== "transfers");
  const freqMap = {};

  expenses.forEach((item) => {
    const key = (item.merchant || "Без названия").trim();
    if (!freqMap[key]) {
      freqMap[key] = { merchant: key, count: 0, total: 0, category: item.category };
    }
    freqMap[key].count += 1;
    freqMap[key].total += item.amount;
  });

  return Object.values(freqMap)
    .sort((a, b) => b.count - a.count || b.total - a.total)
    .slice(0, 7);
}

function weekdayIndex(iso) {
  const day = new Date(`${iso}T12:00:00`).getDay();
  return day === 0 ? 6 : day - 1;
}

function previousPeriodBounds() {
  const { from, to } = getPeriodBounds();
  const fromD = new Date(`${from}T12:00:00`);
  const toD = new Date(`${to}T12:00:00`);
  const span = Math.max(1, Math.round((toD - fromD) / 86400000) + 1);
  const prevTo = new Date(fromD);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - span + 1);
  return { from: isoLocal(prevFrom), to: isoLocal(prevTo) };
}

function computeSpendPortrait(monthItems) {
  const expenses = monthItems.filter((i) => i.kind === "expense" && i.category !== "transfers");
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  if (!expenses.length || total <= 0) return null;

  const weekday = [0, 0, 0, 0, 0, 0, 0];
  expenses.forEach((item) => {
    weekday[weekdayIndex(item.date)] += item.amount;
  });
  const weekend = weekday[5] + weekday[6];
  const weekendShare = weekend / total;
  const peakIdx = weekday.indexOf(Math.max(...weekday));

  const { from, to } = getPeriodBounds();
  const fromD = new Date(`${from}T12:00:00`);
  const toD = new Date(`${to}T12:00:00`);
  const span = Math.max(1, Math.round((toD - fromD) / 86400000) + 1);
  const mid = new Date(fromD);
  mid.setDate(mid.getDate() + Math.floor(span / 2));
  const midIso = isoLocal(mid);
  const early = expenses.filter((item) => item.date < midIso).reduce((sum, item) => sum + item.amount, 0);
  const late = total - early;

  const merchants = {};
  expenses.forEach((item) => {
    const key = (item.merchant || "Без названия").trim();
    if (!merchants[key]) merchants[key] = { merchant: key, total: 0, count: 0, category: item.category };
    merchants[key].total += item.amount;
    merchants[key].count += 1;
  });
  const merchantList = Object.values(merchants);
  const habit = merchantList.filter((row) => row.count >= 3);
  const habitTotal = habit.reduce((sum, row) => sum + row.total, 0);
  const oneOffTotal = merchantList.filter((row) => row.count === 1).reduce((sum, row) => sum + row.total, 0);

  const cats = {};
  expenses.forEach((item) => {
    cats[item.category] = (cats[item.category] || 0) + item.amount;
  });

  const prev = previousPeriodBounds();
  const prevTotal = state.items
    .filter((item) => item.kind === "expense" && item.category !== "transfers" && item.date >= prev.from && item.date <= prev.to)
    .reduce((sum, item) => sum + item.amount, 0);
  const vsPrev = prevTotal > 0 ? (total - prevTotal) / prevTotal : null;

  const smallTotal = expenses.filter((item) => item.amount <= 1000).reduce((sum, item) => sum + item.amount, 0);
  const { balance } = totals();
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const daysLeft = toD > today ? Math.ceil((toD - today) / 86400000) : 0;
  const elapsed = Math.max(1, Math.floor(((toD > today ? today : toD) - fromD) / 86400000) + 1);
  const burn = total / elapsed;
  const runway = burn > 0 ? balance / burn : 99;
  const projected = computePlannerMetrics().projectedRemainder;

  let weather = "clear";
  if (projected < 0 || (daysLeft > 0 && runway < daysLeft * 0.45)) weather = "storm";
  else if (vsPrev != null && vsPrev > 0.18) weather = "wind";
  else if (smallTotal / total > 0.28 || weekendShare > 0.42) weather = "haze";
  else if (daysLeft > 0 && runway < daysLeft * 0.85) weather = "drizzle";

  let handwriting = "steady";
  if (weekendShare > 0.42) handwriting = "weekend";
  else if (habitTotal / total > 0.45) handwriting = "ritual";
  else if (oneOffTotal / total > 0.4) handwriting = "impulse";
  else if (early > late * 1.25) handwriting = "frontloaded";
  else if ((cats.dining || 0) / total > 0.22) handwriting = "city";

  return {
    total,
    weekday,
    weekendShare,
    peakIdx,
    early,
    late,
    habitTotal,
    oneOffTotal,
    vsPrev,
    prevTotal,
    smallTotal,
    weather,
    handwriting,
    runway,
    daysLeft,
  };
}

function helpButton(helpKey, extraClass = "") {
  if (!helpKey) return "";
  const cls = extraClass ? `help-mark ${extraClass}` : "help-mark";
  return `<button class="${cls}" type="button" data-help="${helpKey}" aria-label="${i18n.t("helpAria")}">?</button>`;
}

function closeHelpFloat() {
  const pop = document.getElementById("help-float");
  if (!pop) return;
  pop.hidden = true;
  pop.textContent = "";
  document.querySelectorAll(".help-mark.is-open").forEach((btn) => {
    btn.classList.remove("is-open");
    btn.setAttribute("aria-expanded", "false");
  });
}

function openHelpFloat(btn) {
  const pop = document.getElementById("help-float");
  if (!pop) return;
  const key = btn.dataset.help;
  const text = key ? i18n.t(key) : "";
  if (!text || text === key) return;
  const already = btn.classList.contains("is-open");
  closeHelpFloat();
  if (already) return;
  pop.textContent = text;
  pop.hidden = false;
  btn.classList.add("is-open");
  btn.setAttribute("aria-expanded", "true");
  const rect = btn.getBoundingClientRect();
  const width = Math.min(320, window.innerWidth - 24);
  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
  let top = rect.bottom + 8;
  pop.style.width = `${width}px`;
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
  const box = pop.getBoundingClientRect();
  if (box.bottom > window.innerHeight - 12) {
    pop.style.top = `${Math.max(12, rect.top - box.height - 8)}px`;
  }
}

function vsPrevLabel(vsPrev) {
  if (vsPrev == null) return i18n.t("weatherVsPrevNew");
  const pct = Math.round(Math.abs(vsPrev) * 100);
  if (pct < 4) return i18n.t("weatherVsPrevFlat");
  return i18n.t(vsPrev > 0 ? "weatherVsPrevUp" : "weatherVsPrevDown", { pct });
}

function openActivitySearch(term, category) {
  state.query = term || "";
  state.category = category || "all";
  state.activityMonthOnly = true;
  const searchInput = document.getElementById("search");
  if (searchInput) searchInput.value = state.query;
  const monthOnlyCheckbox = document.getElementById("month-only");
  if (monthOnlyCheckbox) monthOnlyCheckbox.checked = true;
  persistMonthPrefs();
  setView("activity");
  render();
}

function generateSavingsTips(monthItems) {
  const expenses = monthItems.filter((i) => i.kind === "expense" && i.category !== "transfers");
  const total = expenses.reduce((sum, i) => sum + i.amount, 0);
  const tips = [];

  if (!expenses.length || total <= 0) {
    return tips;
  }

  // 1. Кафе и рестораны (dining)
  const diningItems = expenses.filter((i) => i.category === "dining");
  const diningTotal = diningItems.reduce((s, i) => s + i.amount, 0);
  if (diningTotal > 3000 && (diningTotal / total) > 0.15) {
    const saving = Math.round(diningTotal * 0.2);
    tips.push({
      icon: "☕",
      title: "Кафе и доставка еды",
      category: "dining",
      saving,
      text: i18n.t("tipDeliveryDining", {
        amount: i18n.formatMoney(diningTotal),
        count: diningItems.length,
        saving: i18n.formatMoney(saving),
      }),
    });
  }

  // 2. Мелкие утечки до 1000 руб
  const smallLeaks = expenses.filter((i) => i.amount <= 1000);
  const smallLeaksTotal = smallLeaks.reduce((s, i) => s + i.amount, 0);
  if (smallLeaksTotal > 4000 && smallLeaks.length >= 8) {
    tips.push({
      icon: "🪙",
      title: "Мелкие незаметные траты",
      saving: Math.round(smallLeaksTotal * 0.15),
      text: i18n.t("tipSmallLeaks", { amount: i18n.formatMoney(smallLeaksTotal) }),
    });
  }

  // 3. Подписки и цифровые сервисы (services / communications)
  const subs = expenses.filter((i) => i.category === "services" || i.category === "communications");
  const subsTotal = subs.reduce((s, i) => s + i.amount, 0);
  if (subsTotal > 2000) {
    tips.push({
      icon: "📱",
      title: "Сервисы и подписки",
      category: "services",
      saving: Math.round(subsTotal * 0.2),
      text: i18n.t("tipSubscriptions", { amount: i18n.formatMoney(subsTotal) }),
    });
  }

  // 4. Такси и транспорт
  const transitItems = expenses.filter((i) => i.category === "transit");
  const transitTotal = transitItems.reduce((s, i) => s + i.amount, 0);
  if (transitTotal > 2500 && (transitTotal / total) > 0.12) {
    tips.push({
      icon: "🚕",
      title: "Такси и поездки",
      category: "transit",
      saving: Math.round(transitTotal * 0.2),
      text: i18n.t("tipTaxi", { amount: i18n.formatMoney(transitTotal) }),
    });
  }

  // 5. Продукты (groceries)
  const groceriesTotal = expenses.filter((i) => i.category === "groceries").reduce((s, i) => s + i.amount, 0);
  if (groceriesTotal > 10000 && (groceriesTotal / total) > 0.35) {
    tips.push({
      icon: "🛒",
      title: "Супермаркеты",
      category: "groceries",
      saving: Math.round(groceriesTotal * 0.15),
      text: i18n.t("tipGroceries", { amount: i18n.formatMoney(groceriesTotal) }),
    });
  }

  if (!tips.length) {
    tips.push({
      icon: "🌱",
      title: "Баланс в норме",
      text: i18n.t("tipHealthyBudget"),
    });
  }

  return tips;
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === view);
  });
  document.getElementById("view-overview").hidden = view !== "overview";
  document.getElementById("view-planner").hidden = view !== "planner";
  document.getElementById("view-activity").hidden = view !== "activity";
}

function authErrorText(code) {
  const map = {
    invalid_code: "authInvalidCode",
    household_full: "authHouseholdFull",
    already_in_household: "authAlreadyIn",
    config: "syncConfig",
  };
  return i18n.t(map[code] || "authFailed");
}

function renderPasswordSheet() {
  const sheet = document.getElementById("password-sheet");
  const error = document.getElementById("password-error");
  if (!sheet || !error) return;
  error.hidden = !state.passwordError;
  error.textContent = state.passwordError || "";
}

function renderJournalSwitch() {
  const select = document.getElementById("journal-select");
  const block = document.getElementById("journal-block");
  if (!select || !block) return;
  const ready = Boolean(state.session && state.household);
  block.hidden = !ready;
  if (!ready) {
    select.replaceChildren();
    return;
  }
  select.replaceChildren();
  state.journals.forEach((journal) => {
    const opt = document.createElement("option");
    opt.value = journal.id;
    opt.textContent = journal.name;
    if (journal.id === state.household.id) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fillAccountSelect(select, selectedId) {
  if (!select) return;
  const current = selectedId || defaultAccount()?.id || "";
  select.replaceChildren();
  if (!state.accounts.length) {
    select.hidden = true;
    return;
  }
  select.hidden = false;
  state.accounts.forEach((account) => {
    const opt = document.createElement("option");
    opt.value = account.id;
    opt.textContent = account.name;
    if (account.id === current) opt.selected = true;
    select.appendChild(opt);
  });
}

function renderAccounts() {
  const block = document.getElementById("accounts-block");
  const list = document.getElementById("accounts-list");
  if (!block || !list) return;
  const ready = Boolean(state.session && state.household);
  block.hidden = !ready;
  if (!ready) {
    list.replaceChildren();
    return;
  }
  list.innerHTML = state.accounts
    .map((account) => {
      const remainder = accountRemainder(account);
      return `
        <li class="account-row" data-account-id="${account.id}">
          <div class="account-row-head">
            <strong>${escapeHtml(account.name)}</strong>
            <span class="account-remainder">${i18n.formatMoney(remainder)}</span>
          </div>
          <label class="account-stated">
            <span>${i18n.t("accountCardBalance")}</span>
            <input type="number" step="0.01" data-account-stated="${account.id}" value="${remainder}" />
          </label>
          ${
            state.accounts.length > 1
              ? `<button class="text-btn" type="button" data-remove-account="${account.id}">${i18n.t("accountRemove")}</button>`
              : ""
          }
        </li>
      `;
    })
    .join("");
  fillAccountSelect(document.getElementById("compose-account"));
  fillAccountSelect(document.getElementById("import-account"));
}

function renderGate() {
  const gate = document.getElementById("gate");
  const authForm = document.getElementById("auth-form");
  const title = document.getElementById("gate-title");
  const copy = document.getElementById("gate-copy");
  const error = document.getElementById("auth-error");
  const submit = document.getElementById("auth-submit");
  const toggle = document.getElementById("auth-toggle");
  const gateSignOut = document.getElementById("gate-sign-out");
  const signedIn = Boolean(state.session);

  gate.hidden = signedIn;
  document.body.classList.toggle("is-locked", !signedIn);

  if (error) {
    error.hidden = !state.authError;
    error.textContent = state.authError || "";
  }

  if (!signedIn) {
    authForm.hidden = false;
    title.textContent = i18n.t(state.authMode === "signup" ? "signUpTitle" : "authTitle");
    if (copy) {
      copy.hidden = true;
      copy.textContent = "";
    }
    submit.textContent = i18n.t(state.authMode === "signup" ? "signUp" : "signIn");
    toggle.textContent = i18n.t(state.authMode === "signup" ? "haveAccount" : "needAccount");
    if (gateSignOut) gateSignOut.hidden = true;
  } else {
    authForm.hidden = true;
    if (copy) {
      copy.hidden = true;
      copy.textContent = "";
    }
    if (gateSignOut) gateSignOut.hidden = false;
  }

  const email = document.getElementById("session-email");
  const signOut = document.getElementById("sign-out");
  const changePassword = document.getElementById("change-password");
  if (email) {
    email.hidden = !state.session;
    email.textContent = state.session?.user?.email || "";
  }
  if (signOut) signOut.hidden = !state.session;
  if (changePassword) changePassword.hidden = !state.session;
  const deleteAllTest = document.getElementById("delete-all-test");
  if (deleteAllTest) deleteAllTest.hidden = !state.session || !state.household;
  renderJournalSwitch();
  renderAccounts();
}

function renderSyncStatus() {
  const el = document.getElementById("sync-status");
  if (!el) return;
  if (state.loading) {
    el.hidden = false;
    el.className = "sync-status is-loading";
    el.textContent = i18n.t("syncLoading");
    return;
  }
  if (state.syncError) {
    el.hidden = false;
    el.className = "sync-status is-error";
    el.textContent = state.syncError;
    return;
  }
  el.hidden = true;
  el.textContent = "";
}

function renderDonut(rows) {
  const svg = document.getElementById("donut");
  const label = document.getElementById("donut-label");
  const value = document.getElementById("donut-value");
  const total = rows.reduce((s, r) => s + r.value, 0);

  label.textContent = i18n.t("chartOutflow");
  value.textContent = i18n.formatMoney(total);
  value.classList.toggle("is-compact", value.textContent.replace(/\s/g, "").length > 10);

  svg.replaceChildren();
  const stroke = 16;
  if (!total) {
    svg.innerHTML = `<circle cx="80" cy="80" r="54" fill="none" stroke="#d7cdb8" stroke-width="${stroke}" />`;
    return;
  }

  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;
  rows.forEach((row) => {
    const len = (row.value / total) * c;
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "80");
    circle.setAttribute("cy", "80");
    circle.setAttribute("r", String(r));
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", row.color);
    circle.setAttribute("stroke-width", String(stroke));
    circle.setAttribute("stroke-dasharray", `${len} ${c - len}`);
    circle.setAttribute("stroke-dashoffset", String(-offset));
    circle.setAttribute("transform", "rotate(-90 80 80)");
    svg.appendChild(circle);
    offset += len;
  });
}

function renderLegend(rows) {
  const list = document.getElementById("legend");
  list.replaceChildren();
  rows.forEach((row) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <button type="button" data-cat="${row.id}">
        <span><span class="swatch" style="background:${row.color}"></span>${i18n.categoryLabel(row.id)}</span>
        <strong>${i18n.formatMoney(row.value)}</strong>
      </button>`;
    list.appendChild(li);
  });
}

function renderBars() {
  const wrap = document.getElementById("week-bars");
  const days = lastSeven();
  const max = Math.max(...days.map((d) => d.spend), 1);
  wrap.replaceChildren();
  days.forEach((day) => {
    const el = document.createElement("div");
    el.className = `bar${day.spend === max && day.spend > 0 ? " is-hot" : ""}`;
    el.style.height = `${Math.max(10, Math.sqrt(day.spend / max) * 110)}px`;
    el.innerHTML = `<span>${day.label}</span>`;
    el.title = `${i18n.formatShortDate(day.iso)}: ${i18n.formatMoney(day.spend)}`;
    wrap.appendChild(el);
  });
}

function formatSignedAmount(item) {
  const sign = item.kind === "income" ? "+" : "−";
  const formatted = new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    signDisplay: "never",
  }).format(item.amount);
  return `${sign}${formatted}`;
}

function rowHtml(item, withRemove) {
  const cls = item.kind === "income" ? "in" : "out";
  const when = i18n.formatShortDate(item.date);
  const category = i18n.categoryLabel(item.category);
  const subcategory = item.subcategory ? i18n.subcategoryLabel(item.category, item.subcategory) : "";
  const subMeta = subcategory ? ` (${subcategory})` : "";
  const removeLabel = i18n.t("remove");
  return `
    <li class="tx">
      <div class="glyph" style="color:${i18n.CATEGORY_COLORS[item.category] || i18n.CATEGORY_COLORS.other}">
        ${item.merchant.slice(0, 1)}
      </div>
      <div>
        <p class="who">${item.merchant}</p>
        <p class="meta">${category}${subMeta} · ${when}${item.note ? ` · ${item.note}` : ""}</p>
      </div>
      <p class="amount ${cls}">${formatSignedAmount(item)}</p>
      ${withRemove ? `<button class="remove" data-remove="${item.id}" type="button" aria-label="${removeLabel}">${removeLabel}</button>` : "<span></span>"}
    </li>`;
}

function renderLists() {
  const sorted = [...state.items].sort((a, b) => b.date.localeCompare(a.date));
  document.getElementById("recent-list").innerHTML = sorted.slice(0, 5).map((item) => rowHtml(item, false)).join("");

  const rows = filteredItems();
  document.getElementById("full-list").innerHTML = rows.map((item) => rowHtml(item, true)).join("");
  document.getElementById("empty-state").hidden = rows.length > 0;
}

function renderChips() {
  const names = ["all", ...i18n.CATEGORY_IDS];
  const wrap = document.getElementById("chips");
  wrap.replaceChildren();
  names.forEach((id) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `chip${state.category === id ? " is-on" : ""}`;
    btn.textContent = i18n.categoryLabel(id);
    btn.addEventListener("click", () => {
      state.category = id;
      render();
    });
    wrap.appendChild(btn);
  });
}

function computeSpendingInsights(scopedItems) {
  const expenses = scopedItems.filter((i) => i.kind === "expense" && i.category !== "transfers");
  const totalSpend = expenses.reduce((sum, i) => sum + i.amount, 0);

  if (!expenses.length || totalSpend <= 0) {
    return null;
  }

  const bounds = getPeriodBounds();
  const fromDate = new Date(`${bounds.from}T12:00:00`);
  const toDate = new Date(`${bounds.to}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const effectiveEnd = toDate > today ? today : toDate;
  const elapsedDays = Math.max(1, Math.floor((effectiveEnd - fromDate) / 86400000) + 1);
  const burnPerDay = totalSpend / elapsedDays;

  // 2. Топ пожирателей по торговым точкам/местам
  const merchantMap = {};
  expenses.forEach((item) => {
    const key = (item.merchant || "Операция").trim();
    if (!merchantMap[key]) {
      merchantMap[key] = {
        merchant: key,
        total: 0,
        count: 0,
        category: item.category,
      };
    }
    merchantMap[key].total += item.amount;
    merchantMap[key].count += 1;
  });

  const topMerchants = Object.values(merchantMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)
    .map((m) => ({
      ...m,
      percent: Math.round((m.total / totalSpend) * 100),
    }));

  // 3. Мелкие частые траты (незаметные утечки до 1000 ₽)
  const smallTxs = expenses.filter((i) => i.amount > 0 && i.amount <= 1000);
  const smallTotal = smallTxs.reduce((s, i) => s + i.amount, 0);
  const smallCount = smallTxs.length;
  const smallPercent = Math.round((smallTotal / totalSpend) * 100);

  // 4. Подписки и регулярные сервисы (communications, services + ключевые паттерны хостинга/подписок)
  const recurringTxs = expenses.filter((i) => {
    if (i.category === "communications" || i.category === "services") return true;
    const text = `${i.merchant} ${i.note}`.toLowerCase();
    return /подписк|hosting|sweb|яндекс|apple|google|cloud|тв|tv|интернет/i.test(text);
  });
  const recurringTotal = recurringTxs.reduce((s, i) => s + i.amount, 0);

  // 5. Наличные (cash / банкомат)
  const cashTxs = expenses.filter((i) => i.category === "cash");
  const cashTotal = cashTxs.reduce((s, i) => s + i.amount, 0);
  const cashCount = cashTxs.length;

  return {
    totalSpend,
    burnPerDay,
    elapsedDays,
    topMerchants,
    smallTotal,
    smallCount,
    smallPercent,
    recurringTotal,
    recurringCount: recurringTxs.length,
    cashTotal,
    cashCount,
  };
}

function renderAnalytics(scopedItems) {
  const container = document.getElementById("insights-grid");
  const subtitle = document.getElementById("analytics-subtitle");
  if (!container) return;

  const periodText = getPeriodLabel();
  if (subtitle) {
    subtitle.textContent = i18n.t("analyticsSubtitlePeriod", { period: periodText });
  }

  const data = computeSpendingInsights(scopedItems);
  if (!data) {
    container.innerHTML = `<p class="empty">${i18n.t("insightsNoDataPeriod")}</p>`;
    return;
  }

  const items = [];
  const portrait = computeSpendPortrait(scopedItems);

  if (portrait?.vsPrev != null) {
    const delta = data.totalSpend - portrait.prevTotal;
    items.push(`
      <div class="insight-tile">
        <div class="insight-head">
          <span class="insight-badge compare">${portrait.vsPrev > 0 ? "↑" : "↓"}</span>
          <h3>${i18n.t("insightsVsPrevTitle")}</h3>
          ${helpButton("insightsVsPrevHelp")}
        </div>
        <p class="insight-val">${portrait.vsPrev > 0 ? "+" : "−"}${i18n.formatMoney(Math.abs(delta))}</p>
        <p class="insight-desc">${vsPrevLabel(portrait.vsPrev)}</p>
      </div>
    `);
  }

  if (portrait && portrait.weekendShare >= 0.28) {
    items.push(`
      <div class="insight-tile">
        <div class="insight-head">
          <span class="insight-badge weekend">☾</span>
          <h3>${i18n.t("insightsWeekendTitle")}</h3>
          ${helpButton("insightsWeekendHelp")}
        </div>
        <p class="insight-val">${Math.round(portrait.weekendShare * 100)}%</p>
        <p class="insight-desc">${i18n.t("insightsWeekendHint", { pct: Math.round(portrait.weekendShare * 100) })}</p>
      </div>
    `);
  }

  if (portrait && portrait.habitTotal > 0) {
    items.push(`
      <div class="insight-tile">
        <div class="insight-head">
          <span class="insight-badge habit">∞</span>
          <h3>${i18n.t("insightsHabitTitle")}</h3>
          ${helpButton("insightsHabitHelp")}
        </div>
        <p class="insight-val">${i18n.formatMoney(portrait.habitTotal)}</p>
        <p class="insight-desc">${i18n.t("insightsHabitHint", {
          amount: i18n.formatMoney(portrait.habitTotal),
          pct: Math.round((portrait.habitTotal / portrait.total) * 100),
        })}</p>
      </div>
    `);
  }

  // Карточка 1: Темп сгорания
  items.push(`
    <div class="insight-tile">
      <div class="insight-head">
        <span class="insight-badge burn">⚡</span>
          <h3>${i18n.t("insightsBurnTitle")}</h3>
          ${helpButton("insightsBurnHelp")}
      </div>
      <p class="insight-val">${i18n.formatMoney(data.burnPerDay)}<span class="unit"> / день</span></p>
      <p class="insight-desc">${i18n.t("insightsBurnHint")}</p>
    </div>
  `);

  // Карточка 2: Мелкие незаметные траты
  if (data.smallCount > 0) {
    items.push(`
      <div class="insight-tile">
        <div class="insight-head">
          <span class="insight-badge leak">☕</span>
          <h3>${i18n.t("insightsSmallLeaksTitle")}</h3>
        </div>
        <p class="insight-val">${i18n.formatMoney(data.smallTotal)} <span class="badge-sub">${data.smallPercent}% трат</span></p>
        <p class="insight-desc">${i18n.t("insightsSmallLeaksHint", { total: i18n.formatMoney(data.smallTotal), count: data.smallCount })}</p>
      </div>
    `);
  }

  // Карточка 3: Наличные
  if (data.cashTotal > 0) {
    items.push(`
      <div class="insight-tile">
        <div class="insight-head">
          <span class="insight-badge cash">💵</span>
          <h3>${i18n.t("insightsAtmTitle")}</h3>
        </div>
        <p class="insight-val">${i18n.formatMoney(data.cashTotal)}</p>
        <p class="insight-desc">${i18n.t("insightsAtmHint", { amount: i18n.formatMoney(data.cashTotal), count: data.cashCount })}</p>
      </div>
    `);
  }

  // Карточка 4: Регулярка / сервисы
  if (data.recurringTotal > 0) {
    items.push(`
      <div class="insight-tile">
        <div class="insight-head">
          <span class="insight-badge recurring">🔁</span>
          <h3>${i18n.t("insightsRecurringTitle")}</h3>
        </div>
        <p class="insight-val">${i18n.formatMoney(data.recurringTotal)}</p>
        <p class="insight-desc">${i18n.t("insightsRecurringHint")}</p>
      </div>
    `);
  }

  // Карточка 5: Топ пожирателей (на всю ширину сетки)
  if (data.topMerchants.length > 0) {
    const listHtml = data.topMerchants
      .map(
        (m) => `
        <li class="eater-row">
          <button type="button" class="eater-btn" data-search-term="${m.merchant}">
            <div class="eater-info">
              <span class="eater-name">${m.merchant}</span>
              <span class="eater-meta">${m.count} ${m.count === 1 ? "операция" : m.count < 5 ? "операции" : "операций"} · ${i18n.categoryLabel(m.category)}</span>
            </div>
            <div class="eater-cost">
              <strong>${i18n.formatMoney(m.total)}</strong>
              <span class="eater-bar-wrap"><span class="eater-bar" style="width:${Math.max(8, m.percent)}%"></span></span>
              <span class="eater-pct">${m.percent}%</span>
            </div>
          </button>
        </li>
      `
      )
      .join("");

    items.push(`
      <div class="insight-tile full-width">
        <div class="insight-head">
          <span class="insight-badge top">🔥</span>
          <h3>${i18n.t("insightsTopEatersTitle")}</h3>
        </div>
        <p class="insight-desc">${i18n.t("insightsTopEatersHint")}</p>
        <ul class="eaters-list">${listHtml}</ul>
      </div>
    `);
  }

  container.innerHTML = items.join("");

  container.querySelectorAll(".eater-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const term = btn.dataset.searchTerm;
      if (term) {
        state.query = term;
        state.activityMonthOnly = true;
        const searchInput = document.getElementById("search");
        if (searchInput) searchInput.value = term;
        const monthOnlyCheckbox = document.getElementById("month-only");
        if (monthOnlyCheckbox) monthOnlyCheckbox.checked = true;
        persistMonthPrefs();
        setView("activity");
        render();
      }
    });
  });
}

const WEEKDAY_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

function renderWalletWeather(monthItems) {
  const card = document.getElementById("wallet-weather");
  if (!card) return;
  const portrait = computeSpendPortrait(monthItems);
  if (!portrait) {
    card.hidden = true;
    return;
  }
  card.hidden = false;
  card.dataset.weather = portrait.weather;
  const title = document.getElementById("weather-title");
  const hand = document.getElementById("weather-hand");
  const text = document.getElementById("weather-text");
  const stats = document.getElementById("weather-stats");
  const weatherKey = {
    clear: "weatherClear",
    haze: "weatherHaze",
    drizzle: "weatherDrizzle",
    wind: "weatherWind",
    storm: "weatherStorm",
  }[portrait.weather];
  const weatherTextKey = {
    clear: "weatherClearText",
    haze: "weatherHazeText",
    drizzle: "weatherDrizzleText",
    wind: "weatherWindText",
    storm: "weatherStormText",
  }[portrait.weather];
  const handKey = {
    steady: "handSteady",
    weekend: "handWeekend",
    ritual: "handRitual",
    impulse: "handImpulse",
    frontloaded: "handFrontloaded",
    city: "handCity",
  }[portrait.handwriting];
  if (title) title.textContent = i18n.t(weatherKey);
  if (hand) hand.textContent = i18n.t(handKey);
  if (text) text.textContent = i18n.t(weatherTextKey);
  if (stats) {
    const runwayDays = Math.max(0, Math.round(portrait.runway));
    stats.innerHTML = `
      <div>
        <span class="label">${i18n.t("weatherCompareLabel")} ${helpButton("insightsVsPrevHelp", "is-on-dark")}</span>
        <strong>${vsPrevLabel(portrait.vsPrev)}</strong>
      </div>
      <div>
        <span class="label">${i18n.t("weatherMixLabel")} ${helpButton("insightsHabitHelp", "is-on-dark")}</span>
        <strong>${i18n.t("weatherHabitSplit", {
          habit: i18n.formatMoney(portrait.habitTotal),
          impulse: i18n.formatMoney(portrait.oneOffTotal),
        })}</strong>
      </div>
      <div>
        <span class="label">${i18n.t("weatherRunwayLabel")}</span>
        <strong>${i18n.t("weatherRunway", { days: runwayDays })}</strong>
      </div>
    `;
  }
}

function renderSplitBar(leftLabel, rightLabel, leftValue, rightValue) {
  const sum = leftValue + rightValue;
  const leftPct = sum > 0 ? Math.round((leftValue / sum) * 100) : 50;
  return `
    <div class="split-meter">
      <div class="split-meter-head">
        <span>${leftLabel}</span>
        <span>${rightLabel}</span>
      </div>
      <div class="split-track"><span style="width:${leftPct}%"></span></div>
      <div class="split-meter-head">
        <strong>${i18n.formatMoney(leftValue)}</strong>
        <strong>${i18n.formatMoney(rightValue)}</strong>
      </div>
    </div>
  `;
}

function renderSpendPortrait(monthItems) {
  const chart = document.getElementById("weekday-chart");
  const splits = document.getElementById("portrait-splits");
  const portrait = computeSpendPortrait(monthItems);
  if (!chart || !splits) return;
  if (!portrait) {
    chart.innerHTML = `<p class="hint">${i18n.t("insightsNoDataPeriod")}</p>`;
    splits.replaceChildren();
    return;
  }
  const maxDay = Math.max(...portrait.weekday, 1);
  chart.innerHTML = portrait.weekday
    .map((value, index) => {
      const height = Math.max(8, Math.round((value / maxDay) * 100));
      const peak = index === portrait.peakIdx ? " is-peak" : "";
      const weekend = index >= 5 ? " is-weekend" : "";
      return `
        <div class="weekday-col${peak}${weekend}" title="${i18n.formatMoney(value)}">
          <span class="weekday-bar" style="height:${height}%"></span>
          <span class="weekday-name">${WEEKDAY_SHORT[index]}</span>
        </div>
      `;
    })
    .join("");
  splits.innerHTML = `
    <p class="label">${i18n.t("splitEarlyLate")}</p>
    ${renderSplitBar(i18n.t("splitEarly"), i18n.t("splitLate"), portrait.early, portrait.late)}
    <p class="label">${i18n.t("splitHabitImpulse")}</p>
    ${renderSplitBar(i18n.t("splitHabit"), i18n.t("splitImpulse"), portrait.habitTotal, portrait.oneOffTotal)}
    <p class="label">${i18n.t("splitWeekend")}</p>
    ${renderSplitBar(i18n.t("splitWeekday"), i18n.t("splitWeekendLabel"), portrait.total - portrait.weekendShare * portrait.total, portrait.weekendShare * portrait.total)}
  `;
}

function renderPlanner(monthItems) {
  const metrics = computePlannerMetrics();

  // 1. Обновляем мини-виджет в карточке баланса на Главной (Overview)
  const heroUpcoming = document.getElementById("hero-upcoming-figure");
  const heroProjected = document.getElementById("hero-projected-figure");
  if (heroUpcoming) heroUpcoming.textContent = i18n.formatMoney(metrics.upcomingExpenses);
  if (heroProjected) heroProjected.textContent = i18n.formatMoney(metrics.projectedRemainder);

  // 2. Сводка страницы Планировщика
  const curBal = document.getElementById("plan-current-balance");
  const upExp = document.getElementById("plan-upcoming-expenses");
  const expInc = document.getElementById("plan-expected-income");
  const projRem = document.getElementById("plan-projected-remainder");
  const upCount = document.getElementById("plan-upcoming-count");
  const incCount = document.getElementById("plan-income-count");

  if (curBal) curBal.textContent = i18n.formatMoney(metrics.currentBalance);
  if (upExp) upExp.textContent = i18n.formatMoney(metrics.upcomingExpenses);
  if (expInc) expInc.textContent = i18n.formatMoney(metrics.expectedIncome);
  if (projRem) {
    projRem.textContent = i18n.formatMoney(metrics.projectedRemainder);
    projRem.style.color = metrics.projectedRemainder >= 0 ? "var(--ink)" : "#b85c38";
  }

  const expItems = metrics.plannedList.filter((p) => p.kind === "expense");
  const incItems = metrics.plannedList.filter((p) => p.kind === "income");
  if (upCount) upCount.textContent = `${expItems.length} запланированных списаний`;
  if (incCount) incCount.textContent = `${incItems.length} запланированных доходов`;

  renderWalletWeather(monthItems);
  renderSpendPortrait(monthItems);

  const tipsContainer = document.getElementById("planner-tips-list");
  if (tipsContainer) {
    const tips = generateSavingsTips(monthItems);
    tipsContainer.innerHTML = tips
      .map(
        (tip) => `
        <button class="tip-item" type="button" data-tip-category="${tip.category || ""}">
          <span class="tip-icon">${tip.icon}</span>
          <div class="tip-content">
            <strong>${escapeHtml(tip.title)}</strong>
            <p>${tip.text}</p>
          </div>
          ${
            tip.saving
              ? `<span class="tip-save">${i18n.t("tipSaveChip", { amount: i18n.formatMoney(tip.saving) })}</span>`
              : ""
          }
        </button>
      `
      )
      .join("");
    tipsContainer.querySelectorAll("[data-tip-category]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const category = btn.dataset.tipCategory;
        if (category) openActivitySearch("", category);
      });
    });
  }

  const freqContainer = document.getElementById("frequent-expenses-list");
  if (freqContainer) {
    const frequent = computeFrequentExpenses(monthItems);
    if (!frequent.length) {
      freqContainer.innerHTML = `<li class="hint">Нет данных по тратам за выбранный период.</li>`;
    } else {
      const maxTotal = Math.max(...frequent.map((row) => row.total));
      freqContainer.innerHTML = frequent
        .map(
          (f) => `
          <li>
            <button class="frequent-row" type="button" data-search-term="${escapeHtml(f.merchant)}">
              <div class="frequent-info">
                <span class="frequent-name">${escapeHtml(f.merchant)}</span>
                <span class="frequent-meta">${i18n.categoryLabel(f.category)}</span>
                <span class="frequent-bar"><span style="width:${Math.max(8, Math.round((f.total / maxTotal) * 100))}%"></span></span>
              </div>
              <div class="frequent-stats">
                <span class="frequent-count-badge">${f.count} ${f.count === 1 ? "раз" : f.count < 5 ? "раза" : "раз"}</span>
                <strong class="frequent-total">${i18n.formatMoney(f.total)}</strong>
              </div>
            </button>
          </li>
        `
        )
        .join("");
      freqContainer.querySelectorAll("[data-search-term]").forEach((btn) => {
        btn.addEventListener("click", () => openActivitySearch(btn.dataset.searchTerm));
      });
    }
  }

  // 5. Список запланированных операций
  const plannedListEl = document.getElementById("planned-items-list");
  const noPlannedEl = document.getElementById("no-planned-state");
  if (plannedListEl && noPlannedEl) {
    if (!metrics.plannedList.length) {
      plannedListEl.replaceChildren();
      noPlannedEl.hidden = false;
    } else {
      noPlannedEl.hidden = true;
      plannedListEl.innerHTML = metrics.plannedList
        .map((p) => {
          const isInc = p.kind === "income";
          const sub = p.subcategory ? ` (${i18n.subcategoryLabel(p.category, p.subcategory)})` : "";
          return `
          <li class="tx">
            <div class="glyph" style="color:${i18n.CATEGORY_COLORS[p.category] || i18n.CATEGORY_COLORS.other}">
              ${(p.name || "План").slice(0, 1)}
            </div>
            <div>
              <p class="who">${p.name}</p>
              <p class="meta">${i18n.categoryLabel(p.category)}${sub} · Срок: ${i18n.formatShortDate(p.date)}</p>
            </div>
            <p class="amount ${isInc ? "in" : "out"}">${isInc ? "+" : "−"}${i18n.formatMoney(p.amount)}</p>
            <button class="remove" data-remove-planned="${p.id}" type="button" aria-label="Удалить">Удалить</button>
          </li>
        `;
        })
        .join("");
    }
  }
}

function render() {
  closeHelpFloat();
  renderGate();
  renderSyncStatus();
  renderPeriodChrome();
  renderPasswordSheet();
  renderImportSheet();
  const { balance, income, spend, monthItems } = totals();
  document.getElementById("balance-figure").textContent = i18n.formatMoney(balance);
  document.getElementById("income-figure").textContent = i18n.formatMoney(income);
  document.getElementById("spend-figure").textContent = i18n.formatMoney(spend);

  const cats = categorySpend();
  document.getElementById("chart-hint").textContent = cats.length
    ? i18n.t("chartCategoriesPeriod", { count: cats.length })
    : i18n.t("chartNoSpendPeriod");
  renderDonut(cats);
  renderLegend(cats);
  renderBars();
  renderChips();
  renderLists();
  renderAnalytics(monthItems);
  renderPlanner(monthItems);
  renderAccounts();
}

function updateSubcategoryOptions(catSelect, subSelect) {
  if (!catSelect || !subSelect) return;
  const cat = catSelect.value;
  const list = i18n.SUBCATEGORIES[cat] || [];
  subSelect.innerHTML = `<option value="">—</option>` + list.map((s) => `<option value="${s.id}">${s.label}</option>`).join("");
}

function openPlanSheet() {
  const sheet = document.getElementById("plan-sheet");
  if (!sheet) return;
  sheet.hidden = false;
  const form = document.getElementById("plan-form");
  form.reset();
  form.elements.date.value = isoLocal(new Date());

  const catSelect = document.getElementById("plan-category");
  const subSelect = document.getElementById("plan-subcategory");
  if (catSelect) {
    catSelect.innerHTML = i18n.CATEGORY_IDS.map((id) => `<option value="${id}">${i18n.categoryLabel(id)}</option>`).join("");
    updateSubcategoryOptions(catSelect, subSelect);
  }
}

function closePlanSheet() {
  const sheet = document.getElementById("plan-sheet");
  if (sheet) sheet.hidden = true;
}

function toggleDrawer(open) {
  const drawer = document.getElementById("app-drawer");
  const backdrop = document.getElementById("menu-backdrop");
  const burger = document.getElementById("burger-toggle");
  state.drawerOpen = typeof open === "boolean" ? open : !state.drawerOpen;

  if (drawer) drawer.classList.toggle("is-open", state.drawerOpen);
  if (backdrop) backdrop.hidden = !state.drawerOpen;
  if (burger) burger.setAttribute("aria-expanded", String(state.drawerOpen));
}

function openSheet() {
  const sheet = document.getElementById("sheet");
  sheet.hidden = false;
  const form = document.getElementById("compose-form");
  form.reset();
  form.elements.date.value = isoLocal(new Date());

  const catSelect = document.getElementById("compose-category");
  const subSelect = document.getElementById("compose-subcategory");
  if (catSelect && subSelect) {
    updateSubcategoryOptions(catSelect, subSelect);
  }
  fillAccountSelect(document.getElementById("compose-account"));

  form.elements.merchant.focus();
}

function closeSheet() {
  document.getElementById("sheet").hidden = true;
}

function openImportSheet() {
  const sheet = document.getElementById("import-sheet");
  if (!sheet) return;
  state.importError = null;
  sheet.hidden = false;
  renderImportSheet();
}

function   closeImportSheet() {
  const sheet = document.getElementById("import-sheet");
  if (sheet) sheet.hidden = true;
  state.importError = null;
  state.importBusy = false;
}

function renderImportSheet() {
  const sheet = document.getElementById("import-sheet");
  const status = document.getElementById("import-status");
  const summary = document.getElementById("import-summary");
  const wrap = document.getElementById("import-preview-wrap");
  const body = document.getElementById("import-preview-body");
  const confirmBtn = document.getElementById("import-confirm");
  const selectAllBtn = document.getElementById("import-select-all");
  const clearAllBtn = document.getElementById("import-clear-all");
  if (!sheet || sheet.hidden) return;

  const busy = state.importBusy;
  const preview = state.importPreview;

  if (status) {
    status.hidden = !state.importError && !busy;
    status.classList.toggle("is-error", Boolean(state.importError));
    if (state.importError) status.textContent = state.importError;
    else if (busy) status.textContent = i18n.t(preview ? "importSaving" : "importParsing");
  }

  fillAccountSelect(document.getElementById("import-account"));
  document.getElementById("import-pick")?.toggleAttribute("disabled", busy);
  confirmBtn?.toggleAttribute("disabled", busy || !preview?.stats.selected);
  selectAllBtn?.toggleAttribute("disabled", busy || !preview);
  clearAllBtn?.toggleAttribute("disabled", busy || !preview);

  if (summary) {
    if (!preview) {
      summary.hidden = true;
      summary.textContent = "";
    } else if (!preview.stats.selected) {
      summary.hidden = false;
      summary.textContent = i18n.t("importSummaryEmpty");
    } else {
      summary.hidden = false;
      const from = preview.stats.dateFrom ? i18n.formatShortDate(preview.stats.dateFrom) : "—";
      const to = preview.stats.dateTo ? i18n.formatShortDate(preview.stats.dateTo) : "—";
      const parts = [];
      if (preview.bank === "sber") parts.push(i18n.t("bankSber"));
      else if (preview.bank === "alfa") parts.push(i18n.t("bankAlfa"));
      parts.push(
        i18n.t("importSummary", {
          selected: preview.stats.selected,
          total: preview.stats.total,
          from,
          to,
        })
      );
      if (preview.stats.duplicates) {
        parts.push(i18n.t("importDuplicates", { count: preview.stats.duplicates }));
      }
      summary.textContent = parts.join(" · ");
    }
  }

  selectAllBtn.hidden = !preview;
  clearAllBtn.hidden = !preview;
  confirmBtn.hidden = !preview;
  wrap.hidden = !preview;

  if (!body || !preview) {
    if (body) body.replaceChildren();
    return;
  }

  body.replaceChildren();
  folioImport.groupRowsByMonth(preview.rows).forEach(([monthKeyValue, rows]) => {
    const monthRow = document.createElement("tr");
    monthRow.className = "import-month-row";
    const monthCell = document.createElement("td");
    monthCell.colSpan = 5;
    monthCell.textContent = i18n.formatMonthYear(monthKeyValue);
    monthRow.appendChild(monthCell);
    body.appendChild(monthRow);

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.classList.toggle("is-dup", row.duplicate);
      tr.classList.toggle("is-skip", !row.selected && !row.duplicate);

      const checkCell = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = row.selected;
      checkbox.disabled = busy || row.duplicate;
      checkbox.addEventListener("change", () => {
        row.selected = checkbox.checked;
        preview.stats = folioImport.statsForRows(preview.rows);
        renderImportSheet();
      });
      checkCell.appendChild(checkbox);
      tr.appendChild(checkCell);

      const dateCell = document.createElement("td");
      dateCell.textContent = i18n.formatShortDate(row.item.date);
      tr.appendChild(dateCell);

      const merchantCell = document.createElement("td");
      merchantCell.textContent = row.item.merchant;
      if (row.duplicate) {
        const flag = document.createElement("span");
        flag.className = "import-flag";
        flag.textContent = i18n.t("importDuplicate");
        merchantCell.appendChild(flag);
      } else if (row.skipReason) {
        const flag = document.createElement("span");
        flag.className = "import-flag";
        flag.textContent = i18n.t(row.skipReason);
        merchantCell.appendChild(flag);
      }
      tr.appendChild(merchantCell);

      const amountCell = document.createElement("td");
      amountCell.className = row.item.kind === "income" ? "amount-income" : "amount-expense";
      amountCell.textContent = formatSignedAmount(row.item);
      tr.appendChild(amountCell);

      const categoryCell = document.createElement("td");
      categoryCell.textContent = i18n.categoryLabel(row.item.category);
      tr.appendChild(categoryCell);

      body.appendChild(tr);
    });
  });
}

function openPasswordSheet() {
  const sheet = document.getElementById("password-sheet");
  const form = document.getElementById("password-form");
  if (!sheet || !form) return;
  state.passwordError = null;
  sheet.hidden = false;
  form.reset();
  renderPasswordSheet();
}

function closePasswordSheet() {
  const sheet = document.getElementById("password-sheet");
  if (sheet) sheet.hidden = true;
  state.passwordError = null;
}

function setBusy(busy) {
  state.loading = busy;
  document.getElementById("open-compose")?.toggleAttribute("disabled", busy || !state.household);
  document.getElementById("open-import")?.toggleAttribute("disabled", busy || !state.household);
  document.getElementById("delete-all-test")?.toggleAttribute("disabled", busy || !state.household);
  renderSyncStatus();
}

async function backfillSubcategories() {
  if (!window.folioImport?.detectSubcategory || !state.items.length) return;
  const patches = [];
  state.items.forEach((item) => {
    const hay = `${item.merchant || ""} ${item.note || ""}`;
    const yandex = folioImport.yandexFoodKind?.(hay);
    if (yandex === "groceries" && (item.category !== "groceries" || item.subcategory !== "delivery_food")) {
      item.category = "groceries";
      item.subcategory = "delivery_food";
      patches.push({ id: item.id, fields: { category: "groceries", subcategory: "delivery_food" } });
      return;
    }
    if (yandex === "dining" && (item.category !== "dining" || item.subcategory !== "restaurant_delivery")) {
      item.category = "dining";
      item.subcategory = "restaurant_delivery";
      patches.push({ id: item.id, fields: { category: "dining", subcategory: "restaurant_delivery" } });
      return;
    }
    if (item.subcategory) return;
    const next = folioImport.detectSubcategory(item.category, item.note, item.merchant, item.amount);
    if (!next) return;
    item.subcategory = next;
    patches.push({ id: item.id, fields: { subcategory: next } });
  });
  if (!patches.length) return;
  await db.updateItemFields(patches);
}

async function syncPlannedFromCloud() {
  const hid = state.household.id;
  const remote = await db.loadPlannedItems(hid);
  if (remote.length) {
    state.plannedItems = remote;
    persistPlannedItems();
    return;
  }
  if (localStorage.getItem(PLANNED_CLOUD_FLAG)) {
    state.plannedItems = [];
    persistPlannedItems();
    return;
  }
  const local = loadLocalPlannedItems();
  if (local.length) {
    await db.insertPlannedItems(local);
    state.plannedItems = local;
  } else {
    state.plannedItems = [];
  }
  try {
    localStorage.setItem(PLANNED_CLOUD_FLAG, "1");
  } catch {
    /* ignore */
  }
  persistPlannedItems();
}

async function loadJournalData() {
  if (!state.session || !state.household) {
    state.items = [];
    state.accounts = [];
    state.plannedItems = [];
    return;
  }
  const hid = state.household.id;
  const [items, accounts] = await Promise.all([db.loadItems(hid), db.loadAccounts(hid)]);
  state.items = items.map(normalizeItem);
  state.accounts = accounts;
  if (!state.accounts.length) {
    const created = await db.insertAccount({
      name: i18n.t("accountDefaultName"),
      openingBalance: 0,
      isDefault: true,
    });
    state.accounts = [created];
  }
  await syncPlannedFromCloud();
  try {
    await backfillSubcategories();
  } catch (error) {
    console.error(error);
  }
}

function applyJournalList(list, preferredId) {
  state.journals = list || [];
  state.household =
    state.journals.find((row) => row.id === preferredId) ||
    state.journals.find((row) => row.active) ||
    state.journals[0] ||
    null;
  state.membershipRole = state.household?.role || null;
}

async function refreshJournals(preferredId) {
  applyJournalList(await db.ensureJournals(), preferredId);
  if (state.household) {
    await loadJournalData();
    state.syncError = null;
    state.authError = null;
  } else {
    state.items = [];
    state.accounts = [];
    state.plannedItems = [];
  }
}

async function applySession(session) {
  state.session = session;
  state.household = null;
  state.journals = [];
  state.membershipRole = null;
  state.items = [];
  state.accounts = [];
  state.plannedItems = [];
  state.passwordError = null;
  if (!session) {
    state.authError = null;
    return;
  }
  try {
    await refreshJournals();
  } catch (error) {
    console.error(error);
    const code = error.code || error.message;
    if (code === "household_full") {
      state.authError = i18n.t("authHouseholdFull");
    } else {
      state.syncError = i18n.t("syncError");
      state.authError = i18n.t("syncError");
    }
  }
}

async function boot() {
  setBusy(true);
  db.init();
  if (!db.ready) {
    state.syncError = i18n.t("syncConfig");
    state.items = [];
    setBusy(false);
    render();
    return;
  }
  db.onAuthChange(async (session) => {
    setBusy(true);
    await applySession(session);
    setBusy(false);
    render();
  });
  try {
    await applySession(await db.getSession());
  } catch (error) {
    console.error(error);
    state.syncError = i18n.t("syncError");
  }
  setBusy(false);
  render();
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    setView(btn.dataset.view);
    toggleDrawer(false);
  });
});

document.querySelectorAll("[data-goto]").forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.goto));
});

document.getElementById("period-trigger")?.addEventListener("click", (event) => {
  event.stopPropagation();
  togglePeriodPopover();
});

document.getElementById("period-close")?.addEventListener("click", (event) => {
  event.stopPropagation();
  togglePeriodPopover(false);
});

document.getElementById("period-backdrop")?.addEventListener("click", () => {
  togglePeriodPopover(false);
});

document.getElementById("period-popover")?.addEventListener("click", (event) => {
  event.stopPropagation();
});

document.querySelectorAll(".period-preset").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.periodMode;
    if (mode === "month" && btn.dataset.monthPreset === "current") {
      applyPeriodMode("month", { currentMonth: true });
      togglePeriodPopover(false);
      return;
    }
    if (mode === "3months") {
      applyPeriodMode("3months", { month: thisMonth() });
      togglePeriodPopover(false);
      return;
    }
    if (mode === "range") {
      state.periodMode = "range";
      const bounds = getPeriodBounds();
      state.periodFrom = state.periodFrom || monthStart(thisMonth());
      state.periodTo = state.periodTo || bounds.to;
      persistMonthPrefs();
      togglePeriodPopover(true);
      renderPeriodChrome();
    }
  });
});

document.getElementById("period-month-grid")?.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-month]");
  if (!btn) return;
  applyPeriodMode("month", { month: btn.dataset.month });
  togglePeriodPopover(false);
});

document.getElementById("period-range-apply")?.addEventListener("click", () => {
  const from = document.getElementById("period-from")?.value;
  const to = document.getElementById("period-to")?.value;
  if (!from || !to) return;
  applyPeriodMode("range", { from, to: to >= from ? to : from });
  togglePeriodPopover(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.periodOpen) {
    togglePeriodPopover(false);
  }
});

document.getElementById("legend").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-cat]");
  if (!btn) return;
  state.category = btn.dataset.cat;
  setView("activity");
  render();
});

document.getElementById("search").addEventListener("input", (event) => {
  state.query = event.target.value;
  renderLists();
});

document.getElementById("month-only").addEventListener("change", (event) => {
  state.activityMonthOnly = event.target.checked;
  persistMonthPrefs();
  renderLists();
});

document.getElementById("full-list").addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-remove]");
  if (!btn || state.loading) return;
  const id = btn.dataset.remove;
  const prev = state.items.slice();
  state.items = state.items.filter((item) => item.id !== id);
  render();
  try {
    await db.deleteItem(id);
    state.syncError = null;
    renderSyncStatus();
  } catch (error) {
    console.error(error);
    state.items = prev;
    state.syncError = i18n.t("syncSaveError");
    render();
  }
});

document.getElementById("compose-category")?.addEventListener("change", (event) => {
  const subSelect = document.getElementById("compose-subcategory");
  updateSubcategoryOptions(event.target, subSelect);
});

document.getElementById("plan-category")?.addEventListener("change", (event) => {
  const subSelect = document.getElementById("plan-subcategory");
  updateSubcategoryOptions(event.target, subSelect);
});

document.getElementById("open-compose").addEventListener("click", openSheet);
document.getElementById("close-compose").addEventListener("click", closeSheet);
document.getElementById("sheet").addEventListener("click", (event) => {
  if (event.target.id === "sheet") closeSheet();
});

document.getElementById("open-plan-compose")?.addEventListener("click", openPlanSheet);
document.getElementById("close-plan")?.addEventListener("click", closePlanSheet);
document.getElementById("plan-sheet")?.addEventListener("click", (event) => {
  if (event.target.id === "plan-sheet") closePlanSheet();
});

document.getElementById("plan-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.loading || !db.ready || !state.household) return;
  const form = event.currentTarget;
  const data = new FormData(form);
  const planned = {
    id: `plan-${Date.now()}`,
    name: String(data.get("name") || "").trim(),
    amount: Number(data.get("amount")),
    kind: String(data.get("kind")),
    category: String(data.get("category")),
    subcategory: String(data.get("subcategory") || ""),
    date: String(data.get("date")),
  };
  state.plannedItems.unshift(planned);
  persistPlannedItems();
  closePlanSheet();
  render();
  try {
    await db.insertPlannedItem(planned);
    state.syncError = null;
    renderSyncStatus();
  } catch (error) {
    console.error(error);
    state.plannedItems = state.plannedItems.filter((row) => row.id !== planned.id);
    persistPlannedItems();
    state.syncError = i18n.t("syncSaveError");
    render();
  }
});

document.getElementById("planned-items-list")?.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-remove-planned]");
  if (!btn) return;
  const id = btn.dataset.removePlanned;
  const prev = state.plannedItems.slice();
  state.plannedItems = state.plannedItems.filter((p) => p.id !== id);
  persistPlannedItems();
  render();
  try {
    await db.deletePlannedItem(id);
    state.syncError = null;
    renderSyncStatus();
  } catch (error) {
    console.error(error);
    state.plannedItems = prev;
    persistPlannedItems();
    state.syncError = i18n.t("syncSaveError");
    render();
  }
});

// Burger menu listeners
document.getElementById("burger-toggle")?.addEventListener("click", () => {
  toggleDrawer();
});

document.getElementById("drawer-close")?.addEventListener("click", () => {
  toggleDrawer(false);
});

document.getElementById("menu-backdrop")?.addEventListener("click", () => {
  toggleDrawer(false);
});

document.getElementById("journal-select")?.addEventListener("change", async (event) => {
  const id = event.target.value;
  if (!id || state.loading || id === state.household?.id) return;
  setBusy(true);
  try {
    await db.setActiveHousehold(id);
    await refreshJournals(id);
  } catch (error) {
    console.error(error);
    state.syncError = authErrorText(error.code || error.message);
  }
  setBusy(false);
  toggleDrawer(false);
  render();
});

document.getElementById("compose-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.loading || !db.ready) return;
  const form = event.currentTarget;
  const data = new FormData(form);
  const kind = data.get("kind");
  const item = normalizeItem({
    id: `t${Date.now()}`,
    merchant: String(data.get("merchant")).trim(),
    note: String(data.get("note") || "").trim(),
    amount: Number(data.get("amount")),
    kind,
    category: kind === "income" ? "income" : String(data.get("category")),
    subcategory: String(data.get("subcategory") || ""),
    accountId: String(data.get("account") || "") || defaultAccount()?.id || null,
    date: String(data.get("date")),
  });
  state.items.unshift(item);
  closeSheet();
  setView("activity");
  render();
  try {
    await db.insertItem(item);
    state.syncError = null;
    renderSyncStatus();
  } catch (error) {
    console.error(error);
    state.items = state.items.filter((row) => row.id !== item.id);
    state.syncError = i18n.t("syncSaveError");
    render();
  }
});

document.getElementById("auth-toggle").addEventListener("click", () => {
  state.authMode = state.authMode === "signup" ? "signin" : "signup";
  state.authError = null;
  renderGate();
});

document.getElementById("auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!db.ready) {
    state.authError = i18n.t("syncConfig");
    renderGate();
    return;
  }
  const form = event.currentTarget;
  const data = new FormData(form);
  const email = String(data.get("email") || "").trim();
  const password = String(data.get("password") || "");
  setBusy(true);
  state.authError = null;
  try {
    if (state.authMode === "signup") {
      await db.signUp(email, password);
      try {
        await db.signIn(email, password);
      } catch {
        state.authError = i18n.t("authConfirmEmail");
      }
    } else {
      await db.signIn(email, password);
    }
  } catch (error) {
    console.error(error);
    state.authError = error.message || i18n.t("authFailed");
  }
  setBusy(false);
  render();
});

document.getElementById("journal-switch")?.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-journal-id]");
  const id = btn?.dataset.journalId;
  if (!id || state.loading || id === state.household?.id) return;
  setBusy(true);
  try {
    await db.setActiveHousehold(id);
    await refreshJournals(id);
  } catch (error) {
    console.error(error);
    state.syncError = authErrorText(error.code || error.message);
  }
  setBusy(false);
  render();
});

document.getElementById("change-password")?.addEventListener("click", () => {
  openPasswordSheet();
});

document.getElementById("close-password-sheet")?.addEventListener("click", closePasswordSheet);
document.getElementById("password-sheet")?.addEventListener("click", (event) => {
  if (event.target.id === "password-sheet") closePasswordSheet();
});

document.getElementById("password-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!db.ready) return;
  const data = new FormData(event.currentTarget);
  const password = String(data.get("password") || "");
  const confirm = String(data.get("confirm") || "");
  if (password !== confirm) {
    state.passwordError = i18n.t("passwordMismatch");
    renderPasswordSheet();
    return;
  }
  setBusy(true);
  state.passwordError = null;
  try {
    await db.updatePassword(password);
    closePasswordSheet();
  } catch (error) {
    console.error(error);
    state.passwordError = i18n.t("passwordChangeFailed");
    renderPasswordSheet();
  }
  setBusy(false);
  render();
});

async function handleSignOut() {
  if (!db.ready) return;
  setBusy(true);
  try {
    await db.signOut();
  } catch (error) {
    console.error(error);
    state.syncError = i18n.t("syncError");
  }
  setBusy(false);
  render();
}

document.getElementById("sign-out")?.addEventListener("click", handleSignOut);
document.getElementById("gate-sign-out")?.addEventListener("click", handleSignOut);

async function handleImportFile(file) {
  if (!file || state.loading || !state.household) return;
  state.importBusy = true;
  state.importError = null;
  renderImportSheet();
  try {
    state.importPreview = await folioImport.parseFile(file, state.items);
  } catch (error) {
    console.error(error);
    state.importPreview = null;
    const key = String(error.message || "");
    state.importError = i18n.t(key.startsWith("import") ? key : "importFailed");
  }
  state.importBusy = false;
  renderImportSheet();
}

document.getElementById("open-import")?.addEventListener("click", () => {
  state.importPreview = null;
  state.importError = null;
  openImportSheet();
});

document.getElementById("close-import-sheet")?.addEventListener("click", closeImportSheet);
document.getElementById("import-sheet")?.addEventListener("click", (event) => {
  if (event.target.id === "import-sheet") closeImportSheet();
});

document.getElementById("import-pick")?.addEventListener("click", () => {
  document.getElementById("import-file")?.click();
});

document.getElementById("import-file")?.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  await handleImportFile(file);
});

document.getElementById("import-select-all")?.addEventListener("click", () => {
  if (!state.importPreview) return;
  state.importPreview.rows.forEach((row) => {
    if (!row.duplicate) row.selected = true;
  });
  state.importPreview.stats = folioImport.statsForRows(state.importPreview.rows);
  renderImportSheet();
});

document.getElementById("import-clear-all")?.addEventListener("click", () => {
  if (!state.importPreview) return;
  state.importPreview.rows.forEach((row) => {
    row.selected = false;
  });
  state.importPreview.stats = folioImport.statsForRows(state.importPreview.rows);
  renderImportSheet();
});

document.getElementById("import-confirm")?.addEventListener("click", async () => {
  if (!state.importPreview || state.importBusy || !state.household) return;
  const accountId = document.getElementById("import-account")?.value || defaultAccount()?.id || null;
  const selected = state.importPreview.rows
    .filter((row) => row.selected)
    .map((row) => normalizeItem({ ...row.item, accountId }));
  if (!selected.length) return;

  state.importBusy = true;
  state.importError = null;
  renderImportSheet();

  const prev = state.items.slice();
  state.items = [...selected, ...state.items].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)
  );

  try {
    await db.insertItems(selected);
    state.syncError = null;
    const newestMonth = selected.reduce((max, item) => (item.date.slice(0, 7) > max ? item.date.slice(0, 7) : max), selected[0].date.slice(0, 7));
    if (newestMonth) {
      state.periodMode = "month";
      state.selectedMonth = newestMonth;
      persistMonthPrefs();
    }
    state.importPreview = null;
    closeImportSheet();
    setView("activity");
    render();
  } catch (error) {
    console.error(error);
    state.items = prev;
    state.importError = i18n.t("importFailed");
    state.importBusy = false;
    renderImportSheet();
    render();
  }
});

document.getElementById("account-add-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.loading || !db.ready || !state.household) return;
  const form = event.currentTarget;
  const data = new FormData(form);
  const name = String(data.get("name") || "").trim();
  const stated = data.get("stated");
  if (!name) return;
  setBusy(true);
  try {
    const account = await db.insertAccount({
      name,
      openingBalance: stated === "" || stated == null ? 0 : Number(stated),
      isDefault: false,
    });
    state.accounts.push(account);
    form.reset();
    state.syncError = null;
  } catch (error) {
    console.error(error);
    state.syncError = i18n.t("syncSaveError");
  }
  setBusy(false);
  render();
});

document.getElementById("accounts-list")?.addEventListener("change", async (event) => {
  const input = event.target.closest("[data-account-stated]");
  if (!input || state.loading) return;
  const id = input.dataset.accountStated;
  const account = state.accounts.find((row) => row.id === id);
  if (!account) return;
  const stated = Number(input.value);
  if (!Number.isFinite(stated)) return;
  const openingBalance = openingFromStated(account, stated);
  const prev = account.openingBalance;
  account.openingBalance = openingBalance;
  render();
  try {
    await db.updateAccount(id, { openingBalance });
    state.syncError = null;
    renderSyncStatus();
  } catch (error) {
    console.error(error);
    account.openingBalance = prev;
    state.syncError = i18n.t("syncSaveError");
    render();
  }
});

document.getElementById("accounts-list")?.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-remove-account]");
  if (!btn || state.loading) return;
  const id = btn.dataset.removeAccount;
  if (state.accounts.length < 2) return;
  const prev = state.accounts.slice();
  const remaining = state.accounts.filter((row) => row.id !== id);
  try {
    await db.deleteAccount(id);
    if (!remaining.some((row) => row.isDefault) && remaining[0]) {
      remaining[0].isDefault = true;
      await db.updateAccount(remaining[0].id, { isDefault: true });
    }
    state.accounts = remaining;
    state.syncError = null;
    renderSyncStatus();
  } catch (error) {
    console.error(error);
    state.accounts = prev;
    state.syncError = i18n.t("syncSaveError");
  }
  render();
});

document.getElementById("delete-all-test")?.addEventListener("click", async () => {
  if (state.loading || !state.household) return;
  const journal = state.household.name || i18n.t("journalLabel");
  if (!window.confirm(i18n.t("deleteAllConfirm", { journal }))) return;
  setBusy(true);
  const prev = state.items.slice();
  state.items = [];
  render();
  try {
    await db.deleteAllItems(state.household.id);
    state.syncError = null;
  } catch (error) {
    console.error(error);
    state.items = prev;
    state.syncError = i18n.t("deleteAllFailed");
  }
  setBusy(false);
  render();
});

document.addEventListener("click", (event) => {
  const btn = event.target.closest(".help-mark");
  if (btn) {
    event.preventDefault();
    event.stopPropagation();
    openHelpFloat(btn);
    return;
  }
  if (!event.target.closest("#help-float")) closeHelpFloat();
});

window.addEventListener("resize", closeHelpFloat);
document.addEventListener("scroll", closeHelpFloat, true);

boot();
