const STORAGE_KEY = "folio-ledger-v2";

const SEED = [
  { id: "t1", merchant: "Северный рынок", note: "Еженедельные покупки", amount: 8420, kind: "expense", category: "groceries", date: "2026-09-04" },
  { id: "t2", merchant: "Зарплата", note: "1 сентября", amount: 320000, kind: "income", category: "income", date: "2026-09-01" },
  { id: "t3", merchant: "Проездной", note: "На неделю", amount: 3300, kind: "expense", category: "transit", date: "2026-09-03" },
  { id: "t4", merchant: "Кафе Lumen", note: "Обед с Аней", amount: 1840, kind: "expense", category: "dining", date: "2026-09-03" },
  { id: "t5", merchant: "Аренда", note: "Квартира 4Б", amount: 145000, kind: "expense", category: "rent", date: "2026-09-01" },
  { id: "t6", merchant: "Свет и вода", note: "Счёт за август", amount: 6215, kind: "expense", category: "utilities", date: "2026-09-02" },
  { id: "t7", merchant: "Аптека", note: "Пополнение", amount: 2780, kind: "expense", category: "health", date: "2026-09-05" },
  { id: "t8", merchant: "Книжный угол", note: "Карта метро", amount: 1400, kind: "expense", category: "other", date: "2026-09-05" },
  { id: "t9", merchant: "Ресторан Дуб", note: "Ужин", amount: 4650, kind: "expense", category: "dining", date: "2026-09-02" },
  { id: "t10", merchant: "Фриланс", note: "Счёт 118", amount: 45000, kind: "income", category: "income", date: "2026-08-28" },
];

const state = {
  view: "overview",
  query: "",
  category: "all",
  items: loadItems(),
};

function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed.map(normalizeItem);
      }
    }
  } catch {
    /* ignore */
  }
  return SEED.slice();
}

function normalizeItem(item) {
  return {
    ...item,
    category: i18n.normalizeCategory(item.category),
  };
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
}

function monthKey(iso) {
  return iso.slice(0, 7);
}

function thisMonth() {
  return "2026-09";
}

function signed(item) {
  return item.kind === "income" ? item.amount : -item.amount;
}

function totals() {
  const balance = state.items.reduce((sum, item) => sum + signed(item), 0);
  const monthItems = state.items.filter((item) => monthKey(item.date) === thisMonth());
  const income = monthItems.filter((i) => i.kind === "income").reduce((s, i) => s + i.amount, 0);
  const spend = monthItems.filter((i) => i.kind === "expense").reduce((s, i) => s + i.amount, 0);
  return { balance, income, spend, monthItems };
}

function categorySpend() {
  const map = {};
  totals().monthItems
    .filter((item) => item.kind === "expense")
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
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(2026, 8, 5);
    d.setDate(d.getDate() - i);
    const iso = isoLocal(d);
    const spend = state.items
      .filter((item) => item.date === iso && item.kind === "expense")
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
      return catOk && (!q || hay.includes(q));
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === view);
  });
  document.getElementById("view-overview").hidden = view !== "overview";
  document.getElementById("view-activity").hidden = view !== "activity";
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
  const localeTag = i18n.getLocale() === "ru" ? "ru-RU" : "en-US";
  const currency = i18n.getLocale() === "ru" ? "RUB" : "USD";
  const formatted = new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency,
    signDisplay: "never",
  }).format(item.amount);
  return `${sign}${formatted}`;
}

function rowHtml(item, withRemove) {
  const cls = item.kind === "income" ? "in" : "out";
  const when = i18n.formatShortDate(item.date);
  const category = i18n.categoryLabel(item.category);
  const removeLabel = i18n.t("remove");
  return `
    <li class="tx">
      <div class="glyph" style="color:${i18n.CATEGORY_COLORS[item.category] || i18n.CATEGORY_COLORS.other}">
        ${item.merchant.slice(0, 1)}
      </div>
      <div>
        <p class="who">${item.merchant}</p>
        <p class="meta">${category} · ${when}${item.note ? ` · ${item.note}` : ""}</p>
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

function render() {
  const { balance, income, spend } = totals();
  document.getElementById("balance-figure").textContent = i18n.formatMoney(balance);
  document.getElementById("income-figure").textContent = i18n.formatMoney(income);
  document.getElementById("spend-figure").textContent = i18n.formatMoney(spend);

  const cats = categorySpend();
  document.getElementById("chart-hint").textContent = cats.length
    ? i18n.t("chartCategories", { count: cats.length })
    : i18n.t("chartNoSpend");
  renderDonut(cats);
  renderLegend(cats);
  renderBars();
  renderChips();
  renderLists();
}

function openSheet() {
  const sheet = document.getElementById("sheet");
  sheet.hidden = false;
  const form = document.getElementById("compose-form");
  form.reset();
  form.elements.date.value = "2026-09-05";
  form.elements.merchant.focus();
}

function closeSheet() {
  document.getElementById("sheet").hidden = true;
}

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

document.querySelectorAll("[data-goto]").forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.goto));
});

document.querySelectorAll("[data-locale]").forEach((btn) => {
  btn.addEventListener("click", () => i18n.setLocale(btn.dataset.locale));
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

document.getElementById("full-list").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-remove]");
  if (!btn) return;
  state.items = state.items.filter((item) => item.id !== btn.dataset.remove);
  saveItems();
  render();
});

document.getElementById("open-compose").addEventListener("click", openSheet);
document.getElementById("close-compose").addEventListener("click", closeSheet);
document.getElementById("sheet").addEventListener("click", (event) => {
  if (event.target.id === "sheet") closeSheet();
});

document.getElementById("compose-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const kind = data.get("kind");
  const category = kind === "income" ? "income" : String(data.get("category"));
  state.items.push({
    id: `t${Date.now()}`,
    merchant: String(data.get("merchant")).trim(),
    note: String(data.get("note") || "").trim(),
    amount: Number(data.get("amount")),
    kind,
    category,
    date: String(data.get("date")),
  });
  saveItems();
  closeSheet();
  setView("activity");
  render();
});

window.onLocaleChange = () => {
  i18n.applyI18n();
  render();
};

render();
