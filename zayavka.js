// Primește o cerere de pe site, o salvează în Supabase (tabelul zayavki)
// și trimite imediat un mesaj în Telegram proprietarului.
// Toate cheile vin din setările Vercel (Environment Variables), nu din cod:
//   SUPABASE_URL, SUPABASE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

const FIELDS = ["cod", "tip", "serviciu", "perioada", "detalii", "pasageri", "telefon", "email", "plata"];

function clean(v, max) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
}

function escHtml(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Doar POST" });
  }

  const { SUPABASE_URL, SUPABASE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ ok: false, error: "Lipsesc SUPABASE_URL / SUPABASE_KEY în setările Vercel" });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  // Câmp-capcană pentru roboți: oamenii nu îl completează.
  if (body.website) return res.status(200).json({ ok: true, saved: false, notified: false });

  const row = {};
  FIELDS.forEach(f => { row[f] = clean(body[f], f === "detalii" ? 2000 : 300); });
  row.persoane = Number.isFinite(+body.persoane) ? Math.max(0, Math.min(99, Math.round(+body.persoane))) : null;
  row.total_eur = Number.isFinite(+body.total_eur) && +body.total_eur > 0 ? Math.round(+body.total_eur * 100) / 100 : null;

  if (!row.cod || !row.serviciu || !row.telefon || row.telefon.replace(/\D/g, "").length < 8) {
    return res.status(400).json({ ok: false, error: "Lipsesc codul, serviciul sau un telefon valid" });
  }

  // 1) Salvare în Supabase (statusul „новая” și data creării se pun automat).
  let saved = false, dbError = null;
  try {
    const r = await fetch(SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/zayavki", {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(row)
    });
    saved = r.ok;
    if (!r.ok) dbError = (await r.text()).slice(0, 300);
  } catch (e) { dbError = e.message; }

  // 2) Mesaj în Telegram cu toate datele cererii.
  let notified = false, tgError = null;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) tgError = "Lipsesc TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID în setările Vercel";
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    const lines = [
      "🐼 <b>Cerere nouă PANDA TUR</b>",
      "",
      "🔖 <b>Cod:</b> " + escHtml(row.cod),
      "🧳 <b>Serviciu:</b> " + escHtml(row.serviciu),
      row.tip ? "📂 <b>Tip:</b> " + escHtml(row.tip) : null,
      row.perioada ? "📅 <b>Perioada:</b> " + escHtml(row.perioada) : null,
      row.detalii ? "📝 <b>Detalii:</b> " + escHtml(row.detalii) : null,
      row.pasageri ? "👤 <b>Client / pasageri:</b> " + escHtml(row.pasageri) : null,
      row.persoane ? "👥 <b>Persoane:</b> " + row.persoane : null,
      "📞 <b>Telefon:</b> " + escHtml(row.telefon),
      row.email ? "✉️ <b>Email:</b> " + escHtml(row.email) : null,
      row.plata ? "💳 <b>Plata:</b> " + escHtml(row.plata) : null,
      "💶 <b>Total:</b> " + (row.total_eur ? row.total_eur + " €" : "la cerere"),
      "",
      saved ? "✅ Salvată în Supabase, status «новая»" : "⚠️ NU s-a salvat în Supabase: " + escHtml(dbError || "")
    ].filter(l => l !== null);
    try {
      const t = await fetch("https://api.telegram.org/bot" + TELEGRAM_BOT_TOKEN.trim() + "/sendMessage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID.trim(), text: lines.join("\n"), parse_mode: "HTML", disable_web_page_preview: true })
      });
      notified = t.ok;
      if (!t.ok) { try { tgError = (await t.json()).description || ("HTTP " + t.status); } catch (e) { tgError = "HTTP " + t.status; } }
    } catch (e) { notified = false; tgError = "Telegram indisponibil"; }
  }

  // Motivul erorii Telegram (fără token) ajută la configurare; datele clientului nu sunt returnate.
  return res.status(saved || notified ? 200 : 502).json({ ok: saved || notified, saved, notified, telegram: notified ? "ok" : tgError });
};
