const MCC_CATEGORIES = {
  5411: "groceries",
  5422: "groceries",
  5441: "groceries",
  5451: "groceries",
  5499: "groceries",
  5812: "dining",
  5813: "dining",
  5814: "dining",
  4111: "transit",
  4121: "transit",
  4131: "transit",
  4789: "transit",
  4814: "communications",
  4816: "communications",
  6010: "cash",
  6011: "cash",
  5912: "health",
  5122: "health",
  4900: "utilities",
};

const BANK_CATEGORY_MAP = {
  транспорт: "transit",
  продукты: "groceries",
  "еда вне дома": "dining",
  рестораны: "dining",
  "телефон, интернет, тв": "communications",
  здоровье: "health",
  коммунальные: "utilities",
  аренда: "rent",
  доход: "income",
};

const MERCHANT_RULES = [
  [/alfa lss|банкомат|cash withdrawal|снятие наличных/i, "cash"],
  [/перевод|sbp|c2c|между счетами|alfa pay/i, "transfers"],
  [/aeroflot|russian railways|rzd/i, "travel"],
  [/sweb\.ru|tb ufo hosting|интернет|телефон|tv|hosting/i, "communications"],
  [/pyaterochka|перекр[её]ст|lenta|dixy|spar|perekrestok|магнит|winelab|samokat|vkusvill|lavka|fasol|kopikanc/i, "groceries"],
  [/coffee|кофе|restaurant|рестор|kfc|mcdonald|burger|edarit|eda|mostabak|koreana light/i, "dining"],
  [/metro|такси|yandex go|yandex 4121|urent|transport|primorskaya|ultima/i, "transit"],
  [/buketmuket|tabak|\bam\b/i, "shopping"],
  [/kopirka|rector|rosal|alfa iss|yazikov/i, "services"],
  [/apteka|аптек|clinic|клиник/i, "health"],
];

function cellText(value) {
  if (value == null) return "";
  return String(value).replace(/\u00a0/g, " ").trim();
}

function parseRuAmount(raw) {
  const text = cellText(raw).replace(/\s/g, "").replace(/,/g, ".").replace(/[^\d.-]/g, "");
  if (!text) return null;
  const num = Number(text);
  return Number.isFinite(num) ? num : null;
}

function parseRuDate(raw) {
  const text = cellText(raw);
  const match = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
}

function parseExcelDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "number" && value > 20000 && value < 60000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(value));
    const y = epoch.getUTCFullYear();
    const m = String(epoch.getUTCMonth() + 1).padStart(2, "0");
    const d = String(epoch.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return parseRuDate(value);
}

function extractMcc(text) {
  const match = cellText(text).match(/MCC:\s*(\d{4})/i);
  return match ? Number(match[1]) : null;
}

function extractCardMerchant(text) {
  const match = cellText(text).match(/место совершения операции:\s*[^,]*?\/([^/,]+(?:\/[^/,]+)?)/i);
  if (!match) return "";
  const parts = match[1].split("/");
  return cellText(parts[parts.length - 1]).slice(0, 48);
}

function extractAlfaPayMerchant(text) {
  const match = cellText(text).match(/Получатель\s+(.+)$/i);
  return match ? cellText(match[1]).slice(0, 48) : "";
}

function extractMerchant(description, bankCategory) {
  const text = cellText(description);
  if (!text) return cellText(bankCategory).slice(0, 48) || "Операция";

  if (/Операция по карте/i.test(text)) {
    const merchant = extractCardMerchant(text);
    if (merchant) return merchant;
  }

  if (/AlfaPay/i.test(text)) {
    const merchant = extractAlfaPayMerchant(text);
    if (merchant) return merchant;
  }

  if (/Перевод по СБП/i.test(text)) {
    const incoming = /от \+?\d/.test(text);
    return incoming ? "Перевод СБП" : "Перевод СБП";
  }

  if (/Перевод другому клиенту|Перевод от клиента/i.test(text)) {
    return "Перевод Альфа-Банк";
  }

  if (/Внутрибанковский перевод/i.test(text)) {
    return "Перевод между счетами";
  }

  return cellText(bankCategory).slice(0, 48) || text.slice(0, 48);
}

function categorize(description, bankCategory, kind) {
  if (/alfa lss|банкомат|cash withdrawal|снятие наличных/i.test(cellText(description))) return "cash";
  if (isInternalTransfer(description)) return "transfers";
  if (/перевод|sbp|c2c|между счетами|alfa pay/i.test(cellText(description))) return "transfers";
  if (/aeroflot|russian railways|rzd/i.test(cellText(description))) return "travel";
  if (kind === "income") return "income";

  const mcc = extractMcc(description);
  if (mcc && MCC_CATEGORIES[mcc]) return MCC_CATEGORIES[mcc];

  const bankKey = cellText(bankCategory).toLowerCase();
  if (BANK_CATEGORY_MAP[bankKey]) return BANK_CATEGORY_MAP[bankKey];

  const hay = `${description} ${bankCategory}`.toLowerCase();
  for (const [pattern, category] of MERCHANT_RULES) {
    if (pattern.test(hay)) return category;
  }

  return "other";
}

function isInternalTransfer(description) {
  return /Внутрибанковский перевод между счетами/i.test(cellText(description));
}

function buildNote(description, code) {
  const parts = [];
  const desc = cellText(description);
  if (code) parts.push(String(code));
  const mcc = extractMcc(desc);
  if (mcc) parts.push(`MCC ${mcc}`);
  const trimmed = desc.length > 72 ? `${desc.slice(0, 69)}…` : desc;
  if (trimmed && trimmed !== parts.join(" · ")) {
    parts.push(trimmed);
  }
  return parts.join(" · ").slice(0, 72);
}

function normalizeMerchant(value) {
  return cellText(value).toLowerCase().replace(/\s+/g, " ");
}

function itemFingerprint(item) {
  return `${item.date}|${Number(item.amount).toFixed(2)}|${normalizeMerchant(item.merchant)}`;
}

function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const cells = row.map((cell) => cellText(cell).toLowerCase());
    if (cells.some((cell) => cell.includes("дата операции")) && cells.some((cell) => cell.includes("сумма"))) {
      return i;
    }
  }
  return -1;
}

function columnMap(headerRow) {
  const map = {};
  (headerRow || []).forEach((cell, idx) => {
    const key = cellText(cell).toLowerCase();
    if (key.includes("дата операции")) map.dateOp = idx;
    if (key === "код") map.code = idx;
    if (key === "категория") map.category = idx;
    if (key === "описание") map.description = idx;
    if (key.includes("сумма")) map.amount = idx;
    if (key.includes("статус")) map.status = idx;
  });
  return map;
}

function isAlfaStatement(rows) {
  return rows.some((row) => (row || []).some((cell) => cellText(cell) === "Операции по счету"));
}

function parseAlfaRows(rows) {
  const headerIdx = findHeaderRow(rows);
  if (headerIdx < 0) {
    return { items: [], warnings: ["importNoHeader"] };
  }

  const cols = columnMap(rows[headerIdx]);
  if (cols.dateOp == null || cols.amount == null || cols.description == null) {
    return { items: [], warnings: ["importNoHeader"] };
  }

  const items = [];
  const warnings = [];

  for (let i = headerIdx + 1; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const date = parseExcelDate(row[cols.dateOp]);
    const signedAmount = parseRuAmount(row[cols.amount]);
    const description = cellText(row[cols.description]);
    const bankCategory = cols.category != null ? cellText(row[cols.category]) : "";
    const code = cols.code != null ? cellText(row[cols.code]) : "";
    const status = cols.status != null ? cellText(row[cols.status]) : "";

    if (!date || signedAmount == null || signedAmount === 0) continue;
    if (status && status !== "Выполнен") continue;

    const kind = signedAmount < 0 ? "expense" : "income";
    const amount = Math.abs(signedAmount);
    const merchant = extractMerchant(description, bankCategory);
    const category = categorize(description, bankCategory, kind);

    items.push({
      merchant,
      note: buildNote(description, code),
      amount,
      kind,
      category,
      date,
      skipDefault: false,
      skipReason: "",
    });
  }

  if (!items.length) warnings.push("importEmpty");
  return { items, warnings, bank: "alfa" };
}

function readWorkbookRows(arrayBuffer) {
  if (!window.XLSX) throw new Error("importNoXlsx");
  const workbook = window.XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
}

function toPreviewRows(parsedItems, existingItems) {
  const existing = new Set((existingItems || []).map(itemFingerprint));
  return parsedItems.map((row, index) => {
    const item = {
      id: `t${Date.now()}-${index}`,
      merchant: row.merchant,
      note: row.note || "",
      amount: row.amount,
      kind: row.kind,
      category: row.category,
      date: row.date,
    };
    const duplicate = existing.has(itemFingerprint(item));
    const selected = !row.skipDefault && !duplicate;
    return {
      item,
      selected,
      duplicate,
      skipReason: row.skipReason || "",
    };
  });
}

function previewStats(rows) {
  const selected = rows.filter((row) => row.selected);
  const dates = selected.map((row) => row.item.date).sort();
  return {
    total: rows.length,
    selected: selected.length,
    duplicates: rows.filter((row) => row.duplicate).length,
    skipped: rows.filter((row) => !row.selected && !row.duplicate).length,
    dateFrom: dates[0] || "",
    dateTo: dates[dates.length - 1] || "",
  };
}

const folioImport = {
  async parseFile(file, existingItems = []) {
    if (!file) throw new Error("importNoFile");
    const name = String(file.name || "").toLowerCase();
    if (!/\.(xlsx|xls|csv)$/.test(name)) throw new Error("importBadType");

    const buffer = await file.arrayBuffer();
    const rows = readWorkbookRows(buffer);

    let parsed;
    if (isAlfaStatement(rows)) {
      parsed = parseAlfaRows(rows);
    } else {
      parsed = parseAlfaRows(rows);
      if (!parsed.items.length) throw new Error("importUnsupported");
    }

    const previewRows = toPreviewRows(parsed.items, existingItems);
    return {
      bank: parsed.bank || "unknown",
      warnings: parsed.warnings || [],
      rows: previewRows,
      stats: previewStats(previewRows),
    };
  },

  groupRowsByMonth(rows) {
    const groups = new Map();
    rows.forEach((row) => {
      const key = row.item.date.slice(0, 7);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  },

  statsForRows: previewStats,
};

window.folioImport = folioImport;
