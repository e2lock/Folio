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

const PLACEHOLDER_MARKERS = ["YOUR_PROJECT", "YOUR_ANON_KEY"];

function isConfigured() {
  const cfg = window.FOLIO_CONFIG || {};
  const url = String(cfg.supabaseUrl || "").trim();
  const key = String(cfg.supabaseAnonKey || "").trim();
  if (!url || !key) return false;
  return !PLACEHOLDER_MARKERS.some((mark) => url.includes(mark) || key.includes(mark));
}

function mapRow(row) {
  return {
    id: row.id,
    merchant: row.merchant,
    note: row.note || "",
    amount: Number(row.amount),
    kind: row.kind,
    category: i18n.normalizeCategory(row.category),
    date: String(row.date).slice(0, 10),
  };
}

function toRow(item) {
  return {
    id: item.id,
    merchant: item.merchant,
    note: item.note || "",
    amount: item.amount,
    kind: item.kind,
    category: item.category,
    date: item.date,
  };
}

const db = {
  client: null,
  ready: false,
  lastError: null,

  init() {
    if (!isConfigured()) {
      this.ready = false;
      this.lastError = "config";
      return false;
    }
    if (!window.supabase?.createClient) {
      this.ready = false;
      this.lastError = "sdk";
      return false;
    }
    const cfg = window.FOLIO_CONFIG;
    this.client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    this.ready = true;
    this.lastError = null;
    return true;
  },

  async loadItems() {
    if (!this.ready) throw new Error(this.lastError || "not_ready");
    const { data, error } = await this.client
      .from("transactions")
      .select("id, merchant, note, amount, kind, category, date")
      .order("date", { ascending: false })
      .order("id", { ascending: false });
    if (error) throw error;
    const items = (data || []).map(mapRow);
    if (items.length === 0) {
      return this.seedIfEmpty();
    }
    return items;
  },

  async seedIfEmpty() {
    const rows = SEED.map(toRow);
    const { error } = await this.client.from("transactions").insert(rows);
    if (error) throw error;
    return SEED.map((item) => ({ ...item, category: i18n.normalizeCategory(item.category) }));
  },

  async insertItem(item) {
    if (!this.ready) throw new Error("not_ready");
    const { error } = await this.client.from("transactions").insert(toRow(item));
    if (error) throw error;
  },

  async deleteItem(id) {
    if (!this.ready) throw new Error("not_ready");
    const { error } = await this.client.from("transactions").delete().eq("id", id);
    if (error) throw error;
  },
};

window.db = db;
