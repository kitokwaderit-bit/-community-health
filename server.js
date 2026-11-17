// Community Health API - Express + MongoDB (falls back to an embedded NoSQL document store)
const express = require("express");
const path = require("path");
const { seed } = require("./seed");
const { LocalDB } = require("./localdb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "community_health";
const PORT = process.env.PORT || 3000;
const PREFIX = { clinics: "C", doctors: "D", patients: "P", medicines: "M", visits: "V" };
const COLS = Object.keys(PREFIX);

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

let db, mode = "embedded";
const wrap = fn => (req, res) => fn(req, res).catch(e => res.status(e.status || 500).json({ error: e.message }));
const fail = (status, message) => Object.assign(new Error(message), { status });
const all = (col, f = {}) => db.collection(col).find(f).toArray();

const ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/;
const revive = x => typeof x === "string" && ISO.test(x) ? new Date(x)
  : Array.isArray(x) ? x.map(revive)
  : x && typeof x === "object" && !(x instanceof Date) ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, revive(v)])) : x;

async function nextId(col) {
  const n = (await all(col)).reduce((m, d) => Math.max(m, parseInt(String(d._id).slice(1), 10) || 0), 0) + 1;
  return PREFIX[col] + String(n).padStart(3, "0");
}
const checkCol = req => { if (!COLS.includes(req.params.col)) throw fail(404, "Unknown collection"); return req.params.col; };
const tally = (arr, key, init, add) => { const m = new Map(); arr.forEach(x => { for (const k of [].concat(key(x))) { const e = m.get(k) || init(k); add(e, x); m.set(k, e); } }); return [...m.values()]; };

async function lowStock() {
  return (await all("medicines")).flatMap(m => m.stock.filter(s => s.quantity <= s.reorderLevel)
    .map(s => ({ medicineId: m._id, medicine: m.name, clinicId: s.clinicId, quantity: s.quantity, reorderLevel: s.reorderLevel })))
    .sort((a, b) => a.clinicId.localeCompare(b.clinicId) || a.medicine.localeCompare(b.medicine));
}

app.get("/api/mode", (req, res) => res.json({ mode, db: DB_NAME }));

app.get("/api/stats", wrap(async (req, res) => {
  const [visits, patients] = await Promise.all([all("visits"), all("patients")]);
  const counts = {}; for (const c of COLS) counts[c] = await db.collection(c).countDocuments();
  const perClinic = tally(visits, v => v.clinicId, k => ({ _id: k, visits: 0, revenue: 0 }), (e, v) => { e.visits++; e.revenue += v.consultationFee || 0; }).sort((a, b) => b.visits - a.visits || a._id.localeCompare(b._id));
  const topDx = tally(visits, v => v.diagnosis, k => ({ _id: k, n: 0 }), e => e.n++).sort((a, b) => b.n - a.n || a._id.localeCompare(b._id)).slice(0, 6);
  const recent = [...visits].sort((a, b) => b.visitDate - a.visitDate).slice(0, 5);
  res.json({ counts, perClinic, topDx, lowStock: await lowStock(), recent, chronic: patients.filter(p => (p.chronicConditions || []).length).length });
}));
app.get("/api/low-stock", wrap(async (req, res) => res.json(await lowStock())));

app.get("/api/patients/:id/history", wrap(async (req, res) => {
  const p = await db.collection("patients").findOne({ _id: req.params.id });
  if (!p) throw fail(404, "Patient not found");
  p.visits = (await all("visits", { patientId: p._id })).sort((a, b) => b.visitDate - a.visitDate);
  res.json(p);
}));

app.get("/api/safety", wrap(async (req, res) => {
  const [p, m] = await Promise.all([db.collection("patients").findOne({ _id: req.query.patientId }), db.collection("medicines").findOne({ _id: req.query.medicineId })]);
  if (!p || !m) throw fail(404, "Patient or medicine not found");
  const warnings = [];
  for (const a of p.allergies || []) {
    const al = a.toLowerCase();
    if (al === (m.drugClass || "").toLowerCase() || al === m.name.toLowerCase() || (m.contraindications || []).some(c => c.toLowerCase().includes(al)))
      warnings.push(`${p.fullName} is allergic to ${a}; ${m.name} (${m.drugClass}) is not safe.`);
  }
  if (p.pregnancyInfo) (m.contraindications || []).filter(c => /pregnan/i.test(c)).forEach(c => warnings.push(`Pregnancy caution: ${m.name} - ${c}.`));
  res.json({ safe: warnings.length === 0, warnings });
}));

app.post("/api/medicines/:id/stock", wrap(async (req, res) => {
  const { clinicId, delta } = req.body, d = Number(delta);
  if (!clinicId || !Number.isFinite(d)) throw fail(400, "clinicId and numeric delta required");
  const m = await db.collection("medicines").findOne({ _id: req.params.id });
  const line = m?.stock.find(s => s.clinicId === clinicId);
  if (!line) throw fail(404, "That clinic does not stock this medicine");
  line.quantity += d;
  await db.collection("medicines").updateOne({ _id: m._id }, { $set: { stock: m.stock } });
  res.json(m);
}));
app.post("/api/medicines/:id/stock-line", wrap(async (req, res) => {
  const { clinicId, quantity, reorderLevel, expiryDate } = revive(req.body);
  const m = await db.collection("medicines").findOne({ _id: req.params.id });
  if (!m || !clinicId) throw fail(400, "Medicine and clinicId required");
  m.stock.push({ clinicId, quantity: +quantity || 0, reorderLevel: +reorderLevel || 0, expiryDate });
  await db.collection("medicines").updateOne({ _id: m._id }, { $set: { stock: m.stock } });
  res.json(m);
}));

app.get("/api/clinics-near", wrap(async (req, res) => {
  const lng = +req.query.lng, lat = +req.query.lat, R = 6371, rad = x => x * Math.PI / 180;
  const dist = ([x, y]) => 2 * R * Math.asin(Math.sqrt(Math.sin(rad(y - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(y)) * Math.sin(rad(x - lng) / 2) ** 2));
  res.json((await all("clinics")).filter(c => c.location).map(c => ({ ...c, distanceKm: +dist(c.location.coordinates).toFixed(1) })).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 5));
}));

app.post("/api/dev/find", wrap(async (req, res) => {
  const { collection, filter = {}, limit = 20 } = req.body;
  if (!COLS.includes(collection)) throw fail(400, "Unknown collection");
  if (/\$where|\$function|\$accumulator/.test(JSON.stringify(filter))) throw fail(400, "Operator not allowed");
  try { res.json(await db.collection(collection).find(revive(filter)).limit(Math.min(+limit || 20, 100)).toArray()); }
  catch (e) { throw fail(400, e.message); }
}));

app.get("/api/:col", wrap(async (req, res) => res.json((await all(checkCol(req))).sort((a, b) => a._id.localeCompare(b._id)))));
app.get("/api/:col/:id", wrap(async (req, res) => {
  const d = await db.collection(checkCol(req)).findOne({ _id: req.params.id });
  if (!d) throw fail(404, "Not found"); res.json(d);
}));
app.post("/api/:col", wrap(async (req, res) => {
  const col = checkCol(req), docs = [].concat(req.body).map(revive);
  if (!docs.length || docs.some(d => !d || typeof d !== "object")) throw fail(400, "Send a JSON object or an array of objects");
  const out = [];
  for (const d of docs) {
    if (!d._id) d._id = await nextId(col);
    try { await db.collection(col).insertOne(d); }
    catch (e) { throw fail(e.code === 11000 ? 409 : 400, e.code === 11000 ? "Duplicate _id or unique field" : e.message); }
    out.push(d);
  }
  res.status(201).json(out.length === 1 ? out[0] : out);
}));
app.put("/api/:col/:id", wrap(async (req, res) => {
  const body = revive(req.body); delete body._id;
  const r = await db.collection(checkCol(req)).updateOne({ _id: req.params.id }, { $set: body });
  if (!r.matchedCount) throw fail(404, "Not found");
  res.json(await db.collection(req.params.col).findOne({ _id: req.params.id }));
}));
app.delete("/api/:col/:id", wrap(async (req, res) => {
  const r = await db.collection(checkCol(req)).deleteOne({ _id: req.params.id });
  if (!r.deletedCount) throw fail(404, "Not found"); res.json({ deleted: req.params.id });
}));

(async () => {
  if (process.env.DB_MODE !== "local") {
    try {
      const { MongoClient } = require("mongodb");
      const client = await MongoClient.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 });
      db = client.db(DB_NAME); mode = "mongodb";
    } catch (e) { console.log(`MongoDB not reachable at ${MONGO_URI} - using the embedded document store instead.`); }
  }
  if (!db) db = new LocalDB(path.join(__dirname, "data", "community_health.json"));
  await seed(db);
  app.listen(PORT, () => console.log(`\nCommunity Health is running -> open http://localhost:${PORT}\nStorage: ${mode === "mongodb" ? "MongoDB (" + DB_NAME + ")" : "embedded NoSQL document store (data/community_health.json)"}\n`));
})();
