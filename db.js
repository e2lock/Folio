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
    householdId: row.household_id || null,
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

function asJson(data) {
  if (data == null) return null;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
}

function asHouseholdList(data) {
  const rows = asJson(data);
  if (Array.isArray(rows)) return rows.filter((row) => row && row.id);
  if (rows && rows.id) return [rows];
  return [];
}

function rpcMessage(error) {
  const raw = String(error?.message || error || "");
  if (raw.includes("household_full")) return "household_full";
  if (raw.includes("not_in_household")) return "not_in_household";
  return "auth";
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
    this.client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    this.ready = true;
    this.lastError = null;
    return true;
  },

  onAuthChange(handler) {
    if (!this.client) return { data: { subscription: { unsubscribe() {} } } };
    return this.client.auth.onAuthStateChange((_event, session) => handler(session));
  },

  async getSession() {
    if (!this.ready) throw new Error(this.lastError || "not_ready");
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async signIn(email, password) {
    if (!this.ready) throw new Error("not_ready");
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async signUp(email, password) {
    if (!this.ready) throw new Error("not_ready");
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!this.ready) throw new Error("not_ready");
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  },

  async updatePassword(password) {
    if (!this.ready) throw new Error("not_ready");
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw error;
  },

  async ensureJournals() {
    if (!this.ready) throw new Error("not_ready");
    const { data, error } = await this.client.rpc("ensure_named_journals");
    if (error) {
      const code = rpcMessage(error);
      const err = new Error(code);
      err.code = code;
      throw err;
    }
    return asHouseholdList(data);
  },

  async setActiveHousehold(id) {
    if (!this.ready) throw new Error("not_ready");
    const { error } = await this.client.rpc("set_active_household", { target: id });
    if (error) {
      const code = rpcMessage(error);
      const err = new Error(code);
      err.code = code;
      throw err;
    }
  },

  async loadItems(householdId) {
    if (!this.ready) throw new Error(this.lastError || "not_ready");
    let query = this.client
      .from("transactions")
      .select("id, merchant, note, amount, kind, category, date, household_id")
      .order("date", { ascending: false })
      .order("id", { ascending: false });
    if (householdId) query = query.eq("household_id", householdId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapRow);
  },

  async insertItem(item) {
    if (!this.ready) throw new Error("not_ready");
    const { error } = await this.client.from("transactions").insert(toRow(item));
    if (error) throw error;
  },

  async insertItems(items) {
    if (!this.ready) throw new Error("not_ready");
    if (!items.length) return;
    const rows = items.map(toRow);
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const { error } = await this.client.from("transactions").insert(rows.slice(i, i + chunkSize));
      if (error) throw error;
    }
  },

  async deleteItem(id) {
    if (!this.ready) throw new Error("not_ready");
    const { error } = await this.client.from("transactions").delete().eq("id", id);
    if (error) throw error;
  },

  async deleteAllItems(householdId) {
    if (!this.ready) throw new Error("not_ready");
    let query = this.client.from("transactions").delete();
    if (householdId) query = query.eq("household_id", householdId);
    const { error } = await query;
    if (error) throw error;
  },
};

window.db = db;
