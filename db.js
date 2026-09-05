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

function rpcMessage(error) {
  const raw = String(error?.message || error || "");
  if (raw.includes("invalid_code")) return "invalid_code";
  if (raw.includes("household_full")) return "household_full";
  if (raw.includes("already_in_household")) return "already_in_household";
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

  async getHousehold() {
    if (!this.ready) throw new Error("not_ready");
    const { data, error } = await this.client
      .from("households")
      .select("id, invite_code, name")
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createHousehold() {
    if (!this.ready) throw new Error("not_ready");
    const { data, error } = await this.client.rpc("create_household");
    if (error) {
      const code = rpcMessage(error);
      const err = new Error(code);
      err.code = code;
      throw err;
    }
    return data;
  },

  async joinHousehold(invite) {
    if (!this.ready) throw new Error("not_ready");
    const { data, error } = await this.client.rpc("join_household", { invite: String(invite || "").trim() });
    if (error) {
      const code = rpcMessage(error);
      const err = new Error(code);
      err.code = code;
      throw err;
    }
    return data;
  },

  async loadItems() {
    if (!this.ready) throw new Error(this.lastError || "not_ready");
    const { data, error } = await this.client
      .from("transactions")
      .select("id, merchant, note, amount, kind, category, date")
      .order("date", { ascending: false })
      .order("id", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRow);
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
