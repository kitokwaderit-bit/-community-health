
// kitokwa derick
const fs = require("fs"), path = require("path");
const DATE = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/;
const revive = (k, v) => typeof v === "string" && DATE.test(v) ? new Date(v) : v;
const vals = (o, p) => p.split(".").reduce((a, k) => a.flatMap(x => x == null ? [undefined] : Array.isArray(x) ? x.map(y => y?.[k]) : [x[k]]), [o]);
const num = v => v instanceof Date ? +v : v;
const eq = (v, t) => v instanceof Date || t instanceof Date ? num(v) === num(t) : Array.isArray(v) && !Array.isArray(t) ? v.some(x => eq(x, t)) : JSON.stringify(v) === JSON.stringify(t);
function ops(v, c) {
  return Object.entries(c).every(([op, a]) => {
    const arr = Array.isArray(v) ? v : [v];
    switch (op) {
      case "$in": return arr.some(x => a.some(y => eq(x, y)));
      case "$nin": return !arr.some(x => a.some(y => eq(x, y)));
      case "$ne": return !arr.some(x => eq(x, a));
      case "$gt": return arr.some(x => x != null && num(x) > num(a));
      case "$gte": return arr.some(x => x != null && num(x) >= num(a));
      case "$lt": return arr.some(x => x != null && num(x) < num(a));
      case "$lte": return arr.some(x => x != null && num(x) <= num(a));
      case "$regex": return arr.some(x => typeof x === "string" && new RegExp(a, c.$options || "").test(x));
      case "$options": return true;
      case "$size": return Array.isArray(v) && v.length === a;
      case "$exists": return (v !== undefined) === a;
      case "$not": return !ops(v, a);
      default: throw new Error("Operator not supported in embedded store: " + op);
    }
  });
}
function match(doc, f) {
  return Object.entries(f || {}).every(([k, c]) => {
    if (k === "$and") return c.every(x => match(doc, x));
    if (k === "$or") return c.some(x => match(doc, x));
    const vs = vals(doc, k);
    if (c && typeof c === "object" && !(c instanceof Date) && !Array.isArray(c) && Object.keys(c).some(x => x[0] === "$"))
      return vs.some(v => ops(v, c));
    return vs.some(v => eq(v, c));
  });
}
const clone = x => JSON.parse(JSON.stringify(x), revive);
class Cursor {
  constructor(docs) { this.docs = docs; }
  sort(s) { const [k, d] = Object.entries(s)[0]; this.docs.sort((a, b) => (num(a[k]) > num(b[k]) ? 1 : num(a[k]) < num(b[k]) ? -1 : 0) * d); return this; }
  limit(n) { this.docs = this.docs.slice(0, n); return this; }
  async toArray() { return this.docs.map(clone); }
}
class Col {
  constructor(db, name) { this.db = db; this.name = name; }
  get docs() { return this.db.data[this.name] ||= []; }
  find(f) { return new Cursor(this.docs.filter(d => match(d, f))); }
  async findOne(f) { const d = this.docs.find(d => match(d, f)); return d ? clone(d) : null; }
  async countDocuments(f) { return this.docs.filter(d => match(d, f)).length; }
  async insertOne(d) {
    if (this.docs.some(x => x._id === d._id)) throw Object.assign(new Error("duplicate key"), { code: 11000 });
    if (this.name === "doctors" && this.docs.some(x => x.licenseNo === d.licenseNo)) throw Object.assign(new Error("duplicate key"), { code: 11000 });
    this.docs.push(clone(d)); this.db.save(); return { insertedId: d._id };
  }
  async insertMany(a) { for (const d of a) await this.insertOne(d); }
  async updateOne(f, u) {
    const d = this.docs.find(x => match(x, f)); if (!d) return { matchedCount: 0 };
    Object.assign(d, clone(u.$set || {})); this.db.save(); return { matchedCount: 1 };
  }
  async deleteOne(f) { const i = this.docs.findIndex(x => match(x, f)); if (i >= 0) { this.docs.splice(i, 1); this.db.save(); } return { deletedCount: i >= 0 ? 1 : 0 }; }
  async deleteMany() { this.db.data[this.name] = []; this.db.save(); }
  async createIndex() {}
}
class LocalDB {
  constructor(file) {
    this.file = file; this.data = {};
    try { this.data = JSON.parse(fs.readFileSync(file, "utf8"), revive); } catch { }
  }
  collection(n) { return new Col(this, n); }
  save() { fs.mkdirSync(path.dirname(this.file), { recursive: true }); fs.writeFileSync(this.file, JSON.stringify(this.data, null, 1)); }
}
module.exports = { LocalDB };
