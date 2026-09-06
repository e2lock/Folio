const PLACEHOLDER_MARKERS = ["YOUR_PROJECT", "YOUR_ANON_KEY"];

function isConfigured() {
  const cfg = window.FOLIO_CONFIG || {};
  const url = String(cfg.supabaseUrl || "").trim();
  const key = String(cfg.supabaseAnonKey || "").trim();
  if (!url || !key) return false;
  return !PLACEHOLDER_MARKERS.some((mark) => url.includes(mark) || key.includes(mark));
}

function emptyToNull(value) {
  const text = String(value || "").trim();
  return text || null;
}

function mapRow(row) {
  return {
    id: row.id,
    merchant: row.merchant,
    note: row.note || "",
    amount: Number(row.amount),
    kind: row.kind,
    category: i18n.normalizeCategory(row.category),
    subcategory: emptyToNull(row.subcategory),
    accountId: row.account_id || null,
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
    subcategory: emptyToNull(item.subcategory),
    account_id: item.accountId || null,
    date: item.date,
  };
}

function mapAccount(row) {
  return {
    id: row.id,
    name: row.name,
    openingBalance: Number(row.opening_balance || 0),
    isDefault: Boolean(row.is_default),
    householdId: row.household_id || null,
  };
}

function mapPlanned(row) {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    kind: row.kind,
    category: i18n.normalizeCategory(row.category),
    subcategory: emptyToNull(row.subcategory),
    date: row.date ? String(row.date).slice(0, 10) : "",
  };
}

function toPlannedRow(item) {
  return {
    id: item.id,
    name: String(item.name || "").trim(),
    amount: item.amount,
    kind: item.kind,
    category: item.category,
    subcategory: emptyToNull(item.subcategory),
    date: item.date || null,
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
      .select("id, merchant, note, amount, kind, category, subcategory, account_id, date, household_id")
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

  async updateItemFields(patches) {
    if (!this.ready) throw new Error("not_ready");
    if (!patches.length) return;
    const chunkSize = 25;
    for (let i = 0; i < patches.length; i += chunkSize) {
      const chunk = patches.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map((patch) =>
          this.client.from("transactions").update(patch.fields).eq("id", patch.id)
        )
      );
      const failed = results.find((row) => row.error);
      if (failed?.error) throw failed.error;
    }
  },

  async loadAccounts(householdId) {
    if (!this.ready) throw new Error(this.lastError || "not_ready");
    let query = this.client
      .from("accounts")
      .select("id, name, opening_balance, is_default, household_id")
      .order("created_at", { ascending: true });
    if (householdId) query = query.eq("household_id", householdId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapAccount);
  },

  async insertAccount(account) {
    if (!this.ready) throw new Error("not_ready");
    const { data, error } = await this.client
      .from("accounts")
      .insert({
        name: String(account.name || "").trim(),
        opening_balance: Number(account.openingBalance || 0),
        is_default: Boolean(account.isDefault),
      })
      .select("id, name, opening_balance, is_default, household_id")
      .single();
    if (error) throw error;
    return mapAccount(data);
  },

  async updateAccount(id, fields) {
    if (!this.ready) throw new Error("not_ready");
    const row = {};
    if (fields.name != null) row.name = String(fields.name).trim();
    if (fields.openingBalance != null) row.opening_balance = Number(fields.openingBalance);
    if (fields.isDefault != null) row.is_default = Boolean(fields.isDefault);
    const { error } = await this.client.from("accounts").update(row).eq("id", id);
    if (error) throw error;
  },

  async deleteAccount(id) {
    if (!this.ready) throw new Error("not_ready");
    const { error } = await this.client.from("accounts").delete().eq("id", id);
    if (error) throw error;
  },

  async loadPlannedItems(householdId) {
    if (!this.ready) throw new Error(this.lastError || "not_ready");
    let query = this.client
      .from("planned_items")
      .select("id, name, amount, kind, category, subcategory, date, household_id")
      .order("date", { ascending: true })
      .order("id", { ascending: true });
    if (householdId) query = query.eq("household_id", householdId);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapPlanned);
  },

  async insertPlannedItem(item) {
    if (!this.ready) throw new Error("not_ready");
    const { error } = await this.client.from("planned_items").insert(toPlannedRow(item));
    if (error) throw error;
  },

  async insertPlannedItems(items) {
    if (!this.ready) throw new Error("not_ready");
    if (!items.length) return;
    const { error } = await this.client.from("planned_items").insert(items.map(toPlannedRow));
    if (error) throw error;
  },

  async deletePlannedItem(id) {
    if (!this.ready) throw new Error("not_ready");
    const { error } = await this.client.from("planned_items").delete().eq("id", id);
    if (error) throw error;
  },
};

window.db = db;
