const state = {
  view: "overview",
  query: "",
  category: "all",
  selectedMonth: thisMonth(),
  activityMonthOnly: false,
  items: [],
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
};

function normalizeItem(item) {
  return {
    ...item,
    category: i18n.normalizeCategory(item.category),
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

const MONTH_PREFS_STORAGE = "folio-month-prefs-v1";

function isValidMonth(ym) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(ym || ""));
}

function loadMonthPrefs() {
  try {
    const raw = localStorage.getItem(MONTH_PREFS_STORAGE);
    if (!raw) return { selectedMonth: thisMonth(), activityMonthOnly: false };
    const parsed = JSON.parse(raw);
    return {
      selectedMonth: isValidMonth(parsed.selectedMonth) ? parsed.selectedMonth : thisMonth(),
      activityMonthOnly: parsed.activityMonthOnly === true,
    };
  } catch {
    return { selectedMonth: thisMonth(), activityMonthOnly: false };
  }
}

function persistMonthPrefs() {
  try {
    localStorage.setItem(
      MONTH_PREFS_STORAGE,
      JSON.stringify({
        selectedMonth: state.selectedMonth,
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

function totals() {
  const balance = state.items.reduce((sum, item) => sum + signed(item), 0);
  const monthItems = state.items.filter((item) => monthKey(item.date) === state.selectedMonth);
  const spendable = monthItems.filter((i) => i.category !== "transfers");
  const income = spendable.filter((i) => i.kind === "income").reduce((s, i) => s + i.amount, 0);
  const spend = spendable.filter((i) => i.kind === "expense").reduce((s, i) => s + i.amount, 0);
  return { balance, income, spend, monthItems };
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
  const [year, month] = state.selectedMonth.split("-").map(Number);
  const anchor = isCurrentMonth(state.selectedMonth) ? new Date() : new Date(year, month, 0);
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
      const monthOk = !state.activityMonthOnly || monthKey(item.date) === state.selectedMonth;
      return catOk && monthOk && (!q || hay.includes(q));
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function renderMonthChrome() {
  const monthText = i18n.formatMonthYear(state.selectedMonth);
  const subtitle = document.getElementById("brand-subtitle");
  if (subtitle) subtitle.textContent = i18n.t("brandSubtitle", { month: monthText });

  const label = document.getElementById("selected-month");
  if (label) label.textContent = monthText;

  const monthOnly = document.getElementById("month-only");
  if (monthOnly) monthOnly.checked = state.activityMonthOnly;

  const nowBtn = document.getElementById("month-now");
  if (nowBtn) nowBtn.disabled = isCurrentMonth(state.selectedMonth);
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === view);
  });
  document.getElementById("view-overview").hidden = view !== "overview";
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
  const wrap = document.getElementById("journal-switch");
  const block = document.getElementById("journal-block");
  if (!wrap || !block) return;
  const ready = Boolean(state.session && state.household);
  block.hidden = !ready;
  if (!ready) {
    wrap.replaceChildren();
    return;
  }
  wrap.replaceChildren();
  state.journals.forEach((journal) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `nav-btn${journal.id === state.household.id ? " is-active" : ""}`;
    btn.dataset.journalId = journal.id;
    btn.textContent = journal.name;
    wrap.appendChild(btn);
  });
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
  renderGate();
  renderSyncStatus();
  renderMonthChrome();
  renderPasswordSheet();
  renderImportSheet();
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
  form.elements.date.value = isoLocal(new Date());
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
      const parts = [
        i18n.t("importSummary", {
          selected: preview.stats.selected,
          total: preview.stats.total,
          from,
          to,
        }),
      ];
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

async function loadLedger() {
  if (!state.session || !state.household) {
    state.items = [];
    return;
  }
  state.items = (await db.loadItems(state.household.id)).map(normalizeItem);
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
    await loadLedger();
    state.syncError = null;
    state.authError = null;
  } else {
    state.items = [];
  }
}

async function applySession(session) {
  state.session = session;
  state.household = null;
  state.journals = [];
  state.membershipRole = null;
  state.items = [];
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
  btn.addEventListener("click", () => setView(btn.dataset.view));
});

document.querySelectorAll("[data-goto]").forEach((btn) => {
  btn.addEventListener("click", () => setView(btn.dataset.goto));
});

document.getElementById("month-prev").addEventListener("click", () => {
  state.selectedMonth = shiftMonth(state.selectedMonth, -1);
  persistMonthPrefs();
  render();
});

document.getElementById("month-next").addEventListener("click", () => {
  state.selectedMonth = shiftMonth(state.selectedMonth, 1);
  persistMonthPrefs();
  render();
});

document.getElementById("month-now").addEventListener("click", () => {
  state.selectedMonth = thisMonth();
  persistMonthPrefs();
  render();
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

document.getElementById("open-compose").addEventListener("click", openSheet);
document.getElementById("close-compose").addEventListener("click", closeSheet);
document.getElementById("sheet").addEventListener("click", (event) => {
  if (event.target.id === "sheet") closeSheet();
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
  const selected = state.importPreview.rows.filter((row) => row.selected).map((row) => normalizeItem(row.item));
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

boot();
