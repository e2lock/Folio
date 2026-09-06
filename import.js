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

function isSberStatement(rows) {
  return rows.some((row) =>
    (row || []).some((cell) => {
      const t = cellText(cell).toLowerCase();
      return (
        t.includes("сбербанк") ||
        t.includes("выписка по счету") ||
        t.includes("выписка по счёту") ||
        t.includes("дата операции (мск)")
      );
    })
  );
}

function parseSberRows(rows) {
  const headerIdx = findHeaderRow(rows);
  if (headerIdx < 0) {
    return { items: [], warnings: ["importNoHeader"] };
  }

  const cols = columnMap(rows[headerIdx]);
  if (cols.dateOp == null || cols.amount == null) {
    return { items: [], warnings: ["importNoHeader"] };
  }

  const items = [];
  const warnings = [];

  for (let i = headerIdx + 1; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const date = parseExcelDate(row[cols.dateOp]);
    const signedAmount = parseRuAmount(row[cols.amount]);
    const description = cols.description != null ? cellText(row[cols.description]) : "";
    const bankCategory = cols.category != null ? cellText(row[cols.category]) : "";
    const code = cols.code != null ? cellText(row[cols.code]) : "";

    if (!date || signedAmount == null || signedAmount === 0) continue;

    const kind = signedAmount < 0 ? "expense" : "income";
    const amount = Math.abs(signedAmount);
    const merchant = extractSberMerchant(description, bankCategory, false);
    const category = categorizeSber(description, bankCategory, kind);
    const note = buildSberNote(bankCategory, description, code, false);

    items.push({
      merchant,
      note,
      amount,
      kind,
      category,
      date,
      skipDefault: false,
      skipReason: "",
    });
  }

  if (!items.length) warnings.push("importEmpty");
  return { items, warnings, bank: "sber" };
}

/* =========================================================================
   Sberbank PDF Parser
   ========================================================================= */

async function ensurePdfJs() {
  if (window.pdfjsLib) {
    if (!window.pdfjsLib.GlobalWorkerOptions?.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js";
    }
    return window.pdfjsLib;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js";
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js";
        resolve(window.pdfjsLib);
      } else {
        reject(new Error("importNoPdfLib"));
      }
    };
    script.onerror = () => reject(new Error("importNoPdfLib"));
    document.head.appendChild(script);
  });

  return window.pdfjsLib;
}

async function extractPdfLines(arrayBuffer) {
  const pdfjs = await ensurePdfJs();
  let pdf;
  try {
    const loadingTask = pdfjs.getDocument({
      data: arrayBuffer,
      disableWorker: false,
      isEvalSupported: false,
    });
    pdf = await loadingTask.promise;
  } catch {
    const fallbackTask = pdfjs.getDocument({
      data: arrayBuffer,
      disableWorker: true,
      isEvalSupported: false,
    });
    pdf = await fallbackTask.promise;
  }

  const lines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const buckets = [];
    for (const item of textContent.items) {
      const str = (item.str || "").replace(/\u00a0/g, " ");
      if (!str.trim()) continue;

      const x = item.transform ? item.transform[4] : 0;
      const y = item.transform ? item.transform[5] : 0;

      let bucket = buckets.find((b) => Math.abs(b.y - y) <= 3.5);
      if (!bucket) {
        bucket = { y, items: [] };
        buckets.push(bucket);
      }
      bucket.items.push({ x, str: item.str });
    }

    buckets.sort((a, b) => b.y - a.y);

    for (const bucket of buckets) {
      bucket.items.sort((a, b) => a.x - b.x);

      let lineText = "";
      for (const it of bucket.items) {
        const piece = it.str.replace(/\u00a0/g, " ").trim();
        if (!piece) continue;
        if (!lineText) {
          lineText = piece;
        } else {
          lineText += " " + piece;
        }
      }
      if (lineText) {
        lines.push(lineText);
      }
    }
  }

  return lines;
}

function isSberPdf(lines) {
  const sample = lines.slice(0, 50).join(" ").toLowerCase();
  return (
    sample.includes("сбербанк") ||
    sample.includes("выписка по платёжному счёту") ||
    sample.includes("выписка по платежному счету") ||
    sample.includes("выписка по счёту") ||
    sample.includes("выписка по счету") ||
    sample.includes("дата операции (мск)")
  );
}

function parseSberTxHeader(rest) {
  const matches = [...rest.matchAll(/([+-]?\d[\d\s]*,\d{2})/g)];
  if (!matches.length) return null;

  let amountStr = "";
  let balanceStr = "";
  let categoryRaw = "";

  if (matches.length >= 2) {
    const amountMatch = matches[matches.length - 2];
    const balanceMatch = matches[matches.length - 1];
    amountStr = amountMatch[0];
    balanceStr = balanceMatch[0];
    categoryRaw = rest.slice(0, amountMatch.index).trim();
  } else {
    const amountMatch = matches[0];
    amountStr = amountMatch[0];
    categoryRaw = rest.slice(0, amountMatch.index).trim();
  }

  const rawClean = amountStr.replace(/\s/g, "");
  const isIncome = rawClean.startsWith("+");
  const numVal = Math.abs(Number(rawClean.replace("+", "").replace(",", ".")));
  if (!Number.isFinite(numVal) || numVal === 0) return null;

  return {
    categoryRaw,
    amount: numVal,
    kind: isIncome ? "income" : "expense",
    balance: balanceStr ? parseRuAmount(balanceStr) : null,
  };
}

function isSberInternalTransfer(desc, categoryRaw, ownerName, ownerInitials) {
  const d = cellText(desc).toLowerCase();
  const c = cellText(categoryRaw).toLowerCase();

  if (/между своими/i.test(d) || /между своими/i.test(c)) return true;

  if (ownerInitials) {
    const initLower = ownerInitials.toLowerCase();
    if (d.includes(initLower)) return true;
  }

  if (ownerName) {
    const parts = ownerName.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
    if (parts.length >= 2) {
      const lastName = parts[0];
      const firstName = parts[1];
      if (d.includes(lastName) && d.includes(firstName)) return true;
      if (new RegExp(`перевод (для|от)\\s+${lastName[0]}\\.?\\s*${firstName}`, "i").test(d)) return true;
    }
  }

  return false;
}

function extractSberMerchant(desc, categoryRaw, isInternal) {
  if (isInternal) {
    return "Перевод между своими счетами";
  }

  let s = cellText(desc)
    .replace(/\.?\s*Операция по (карте|счету|счёту)[^\n]*/gi, "")
    .replace(/\s+(SANKT-PETERBU|ST PETERSBURG|MOSCOW|KRASNODAR|PAVLOVSK|DOMODEDOVO)\s+RUS\b/gi, "")
    .replace(/\s+RUS\b/gi, "")
    .replace(/^SBSCR_/i, "")
    .trim();

  if (/YANDEX\*4121\*GO/i.test(s)) return "Yandex Go";
  if (/YANDEX\*5411\*LAVKA/i.test(s)) return "Яндекс Лавка";
  if (/YANDEX\*5411\*EDARIT/i.test(s)) return "Яндекс Еда";
  if (/YANDEX\*5815\*PLATFORM/i.test(s)) return "Яндекс Плюс";
  if (/YANDEX\*7999\*SCOOTERS/i.test(s)) return "Яндекс Самокаты";
  if (/SBER\*5411\*SAMOKAT/i.test(s)) return "Самокат";
  if (/WHOOSH/i.test(s)) return "Whoosh";
  if (/MAPP_SBERBANK_ONL/i.test(s)) return "СберБанк Онлайн";
  if (/ROSTELECOM/i.test(s)) return "Ростелеком";
  if (/Russian Railways/i.test(s)) return "РЖД";
  if (/ATM\s*(\d+)/i.test(s)) return `Банкомат №${s.match(/ATM\s*(\d+)/i)[1]}`;
  if (/Банкомат\s*(№?\s*\d+)/i.test(s)) return `Банкомат ${s.match(/Банкомат\s*(№?\s*\d+)/i)[1]}`;

  const transferMatch = s.match(/^Перевод\s+(из|в|от|для)\s+(.+)$/i);
  if (transferMatch) {
    return `Перевод: ${transferMatch[2].trim()}`.slice(0, 48);
  }

  const qrPrefix = s.match(/^[A-Z0-9]{3,6}\s+(.+)$/i);
  if (qrPrefix && qrPrefix[1].length > 2) {
    s = qrPrefix[1].trim();
  }

  if (s) return s.slice(0, 48);
  return cellText(categoryRaw).slice(0, 48) || "Операция";
}

function categorizeSber(desc, categoryRaw, kind) {
  const d = cellText(desc).toLowerCase();
  const c = cellText(categoryRaw).toLowerCase();
  const hay = `${d} ${c}`;

  if (/выдача наличных|снятие наличных|внесение наличных|банкомат|atm\b/i.test(hay)) {
    return "cash";
  }

  if (/перевод|сбп|c2c/i.test(hay)) {
    return "transfers";
  }

  if (/путешествия|авиа|rzd|жд|ржд|aeroflot|russian railways|слетать\.ру/i.test(hay)) {
    return "travel";
  }

  if (/транспорт|yandex go|yandex\*4121|такси|taxi|metro|метро|whoosh|urent|автобус|avtobus|szpp|сзпп|nspk|bilet\.nspk|primorskaya|komendantskiy|chkalovskaya/i.test(hay)) {
    return "transit";
  }

  if (/коммунальные платежи, связь, интернет/i.test(c)) {
    if (/rostelecom|ростелеком|мтс|mts|билайн|beeline|мегафон|megafon|tele2|t2|интернет|связь|телефон/i.test(d)) {
      return "communications";
    }
    return "utilities";
  }
  if (/связь|интернет|rostelecom|ростелеком|sweb|hosting/i.test(hay)) {
    return "communications";
  }

  if (/супермаркеты|продукты/i.test(c) ||
      /pyaterochka|пятерочка|пятёрочка|дикси|dixy|магнит|magnit|самокат|samokat|лавка|lavka|вкусвилл|vkusvill|lenta|лента|spar|winelab|винлаб|superbabilon|мини маркет|minimarket|фасоль|fasol/i.test(hay)) {
    return "groceries";
  }

  if (/рестораны|кафе|общепит/i.test(c) ||
      /coffee|кофе|restaurant|рестор|burger|kfc|mcdonald|uppetit|аппетит|pelmesh|пельмеш|cekh 85|цех 85|surf coffee|пекарня|булочная|столовая|kebab|кебаб|etlon/i.test(hay)) {
    return "dining";
  }

  if (/здоровье|красота|аптек|apteka|clinic|клиник|стома|stoma|36,6|36\.6|инвитро|invitro|gemotest/i.test(hay)) {
    return "health";
  }

  if (/коммунальн|жкх/i.test(c)) {
    return "utilities";
  }

  if (/сервисы|услуги/i.test(c) ||
      /mapp_sberbank|старт\.ру|start\.ru|подписк/i.test(hay)) {
    return "services";
  }

  if (/одежда|обувь|дом|ремонт|покупки/i.test(c) ||
      /wildberries|вайлдберриз|ozon|озон|яндекс маркет|stomaestet/i.test(hay)) {
    return "shopping";
  }

  if (kind === "income") return "income";

  for (const [pattern, category] of MERCHANT_RULES) {
    if (pattern.test(hay)) return category;
  }

  return "other";
}

function buildSberNote(categoryRaw, fullDesc, authCode, isInternal) {
  const parts = [];
  if (isInternal) {
    parts.push("Перевод между своими счетами");
  }
  if (authCode && authCode !== "-") {
    parts.push(`Код ${authCode}`);
  }
  const cardMatch = fullDesc.match(/Операция по карте\s*(\*{2,4}\d{4})/i);
  if (cardMatch) {
    parts.push(`Карта ${cardMatch[1].replace(/\*/g, "•")}`);
  }
  const accMatch = fullDesc.match(/Операция по сч[её]ту\s*(\*{2,4}\d{4})/i);
  if (accMatch) {
    parts.push(`Счёт ${accMatch[1].replace(/\*/g, "•")}`);
  }
  const cat = cellText(categoryRaw);
  if (cat && !/прочие операции|прочие расходы|оплата по qr/i.test(cat) && !isInternal) {
    parts.push(cat);
  }
  return parts.join(" · ").slice(0, 72);
}

function parseSberPdfLines(lines) {
  const items = [];
  const warnings = [];

  let ownerName = "";
  let ownerInitials = "";
  for (let i = 0; i < Math.min(lines.length, 40); i += 1) {
    if (/Владелец сч[её]та/i.test(lines[i])) {
      ownerName = cellText(lines[i + 1] || "");
      break;
    }
  }
  if (ownerName) {
    const parts = ownerName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      ownerInitials = `${parts[0][0]}. ${parts[1]}`;
    }
  }

  const isSkipLine = (line) => {
    const s = cellText(line).trim();
    if (!s) return true;
    if (/^Действителен|^Для проверки|^900 www|^ул\.\s*Вавилова|^Заказано в СберБанк/i.test(s)) return true;
    if (/^Выписка по плат[её]жному сч[её]ту|^Выписка по сч[её]ту/i.test(s)) return true;
    if (/^За период|^Владелец сч[её]та|^Номер сч[её]та|^Карты,\s*привязанные|^Валюта|^Дата открытия|^Дата закрытия/i.test(s)) return true;
    if (/^ИТОГО ПО ОПЕРАЦИЯМ|^Остаток на|^Пополнение|^Списание|^Расшифровка операций/i.test(s)) return true;
    if (/^Продолжение на следующей странице|^-- \d+ of \d+ --/i.test(s)) return true;
    if (/^ДАТА ОПЕРАЦИИ|^Дата обработки|^и код авторизации|^КАТЕГОРИЯ|^Описание операции|^СУММА В ВАЛЮТЕ|^Сумма в валюте|^операции\d?|^ОСТАТОК СРЕДСТВ|^В валюте сч[её]та/i.test(s)) return true;
    if (/^Дата формирования документа|^ПАО Сбербанк|^Денежные средства списываются|^В выписке отображаются|^Срок обработки|^По курсу банка|^Согласно статье|^Скачать электронный|^Проверить подпись/i.test(s)) return true;
    if (/^\d{1,2}$/.test(s)) return true;
    if (/^\*$/.test(s) || /^[0-9A-Fa-f]{32}$/.test(s)) return true;
    if (/^с \d{2}\.\d{2}\.\d{4} по \d{2}\.\d{2}\.\d{4}$/i.test(s)) return true;
    return false;
  };

  const txBlocks = [];
  let currentBlock = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = cellText(lines[i]).trim();
    if (isSkipLine(line)) continue;

    const isTxStart = /^(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})\b/.test(line);

    if (isTxStart) {
      if (currentBlock) {
        txBlocks.push(currentBlock);
      }
      currentBlock = {
        headerLine: line,
        detailLines: [],
      };
    } else if (currentBlock) {
      currentBlock.detailLines.push(line);
    }
  }
  if (currentBlock) {
    txBlocks.push(currentBlock);
  }

  for (const block of txBlocks) {
    const headerMatch = block.headerLine.match(/^(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})\s+(.+)$/);
    if (!headerMatch) continue;

    const dateRu = headerMatch[1];
    const date = parseRuDate(dateRu);
    const rest = headerMatch[3].trim();

    const headerInfo = parseSberTxHeader(rest);
    if (!headerInfo || !headerInfo.amount || !date) continue;

    let authCode = "";
    let fullDesc = "";

    for (const dline of block.detailLines) {
      const authMatch = dline.match(/^(\d{2}\.\d{2}\.\d{4})\s+(\d{6}|-)\s+(.*)$/);
      if (authMatch) {
        authCode = authMatch[2] !== "-" ? authMatch[2] : "";
        fullDesc = fullDesc ? `${fullDesc} ${authMatch[3]}` : authMatch[3];
      } else {
        fullDesc = fullDesc ? `${fullDesc} ${dline}` : dline;
      }
    }

    fullDesc = fullDesc.trim();

    const isInternal = isSberInternalTransfer(fullDesc, headerInfo.categoryRaw, ownerName, ownerInitials);
    const merchant = extractSberMerchant(fullDesc, headerInfo.categoryRaw, isInternal);
    const category = isInternal ? "transfers" : categorizeSber(fullDesc, headerInfo.categoryRaw, headerInfo.kind);
    const note = buildSberNote(headerInfo.categoryRaw, fullDesc, authCode, isInternal);

    items.push({
      merchant,
      note,
      amount: headerInfo.amount,
      kind: headerInfo.kind,
      category,
      date,
      skipDefault: false,
      skipReason: isInternal ? "importSkipInternal" : "",
    });
  }

  if (!items.length) {
    warnings.push("importEmpty");
  }

  return { items, warnings, bank: "sber" };
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
    if (!/\.(xlsx|xls|csv|pdf)$/.test(name)) throw new Error("importBadType");

    const buffer = await file.arrayBuffer();
    let parsed;

    if (/\.pdf$/i.test(name)) {
      const lines = await extractPdfLines(buffer);
      if (!lines.length) throw new Error("importEmpty");
      if (isSberPdf(lines)) {
        parsed = parseSberPdfLines(lines);
      } else {
        parsed = parseSberPdfLines(lines);
        if (!parsed.items.length) throw new Error("importUnsupported");
      }
    } else {
      const rows = readWorkbookRows(buffer);
      if (isAlfaStatement(rows)) {
        parsed = parseAlfaRows(rows);
      } else if (isSberStatement(rows)) {
        parsed = parseSberRows(rows);
      } else {
        parsed = parseAlfaRows(rows);
        if (!parsed.items.length) {
          parsed = parseSberRows(rows);
        }
        if (!parsed.items.length) throw new Error("importUnsupported");
      }
    }

    const previewRows = toPreviewRows(parsed.items, existingItems);
    return {
      bank: parsed.bank || "unknown",
      warnings: parsed.warnings || [],
      rows: previewRows,
      stats: previewStats(previewRows),
    };
  },

  extractPdfLines,
  parseSberPdfLines,
  isSberPdf,

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
