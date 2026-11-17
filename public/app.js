/* Community Health - single-page front end (vanilla JS, talks to /api) */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = d => d ? new Date(d).toISOString().slice(0, 10) : "-";
const age = d => Math.floor((Date.now() - new Date(d)) / 31557600000);
const list = s => (s || "").split(",").map(x => x.trim()).filter(Boolean);
let db = {}, view = "dashboard";

async function api(path, opt = {}) {
  const r = await fetch("/api" + path, { headers: { "Content-Type": "application/json" }, ...opt, body: opt.body ? JSON.stringify(opt.body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
}
function toast(msg, err) { const t = $("#toast"); t.textContent = msg; t.className = "toast" + (err ? " err" : ""); t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 3200); }
async function load() { const cols = ["clinics", "doctors", "patients", "medicines", "visits"]; (await Promise.all(cols.map(c => api("/" + c)))).forEach((d, i) => db[cols[i]] = d); }
const by = (col, id) => (db[col] || []).find(x => x._id === id);
const nm = (col, id, f = "name") => by(col, id)?.[f] || id;
const opts = (col, f, sel) => db[col].map(x => `<option value="${x._id}" ${x._id === sel ? "selected" : ""}>${esc(x[f])} (${x._id})</option>`).join("");

/* ---- modal ---- */
function modal(title, html) { $("#mtitle").textContent = title; $("#mbody").innerHTML = html; $("#modal").hidden = false; }
const closeModal = () => $("#modal").hidden = true;
$("#mclose").onclick = closeModal;
$("#modal").onclick = e => { if (e.target.id === "modal") closeModal(); };
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
const fd = form => Object.fromEntries(new FormData(form));
async function submitForm(form, fn) { form.onsubmit = async e => { e.preventDefault(); try { await fn(fd(form)); await load(); closeModal(); render(); } catch (x) { toast(x.message, true); } }; }

/* ---- navigation ---- */
$("#nav").onclick = e => { const b = e.target.closest("button"); if (!b) return; view = b.dataset.v; document.querySelectorAll("#nav button").forEach(x => x.classList.toggle("on", x === b)); render(); };
function setHead(t, html = "") { $("#title").textContent = t; $("#actions").innerHTML = html; }
function render() { ({ dashboard, patients, visits, medicines, clinics, dev })[view](); }

/* ---- dashboard ---- */
async function dashboard() {
  setHead("Overview");
  const s = await api("/stats"), max = Math.max(...s.perClinic.map(x => x.visits), 1), mdx = Math.max(...s.topDx.map(x => x.n), 1);
  $("#view").innerHTML = `
  <div class="grid g4">
    <div class="card kpi"><b>${s.counts.patients}</b><span>Patients registered</span></div>
    <div class="card kpi"><b>${s.counts.visits}</b><span>Visits recorded</span></div>
    <div class="card kpi"><b>${s.chronic}</b><span>Patients with chronic illness</span></div>
    <div class="card kpi ${s.lowStock.length ? "warn" : ""}"><b>${s.lowStock.length}</b><span>Stock lines to re-order</span></div>
  </div>
  <div class="grid g2" style="margin-top:16px">
    <div class="card"><h3>Visits per clinic</h3>${s.perClinic.map(c => `<div class="bar"><span>${esc(nm("clinics", c._id).replace(/ (Community|Health|Family|Mobile).*/, ""))}</span><div class="t"><i style="width:${c.visits / max * 100}%"></i></div><b>${c.visits}</b></div>`).join("")}</div>
    <div class="card"><h3>Most common diagnoses</h3>${s.topDx.map(d => `<div class="bar"><span title="${esc(d._id)}">${esc(d._id.slice(0, 18))}</span><div class="t"><i style="width:${d.n / mdx * 100}%;background:var(--amber)"></i></div><b>${d.n}</b></div>`).join("")}</div>
    <div class="card"><h3>Re-order alerts</h3>${s.lowStock.length ? `<div class="tbl"><table><tr><th>Medicine</th><th>Clinic</th><th>Left</th><th>Level</th></tr>${s.lowStock.map(l => `<tr><td>${esc(l.medicine)}</td><td>${esc(nm("clinics", l.clinicId))}</td><td><span class="chip red">${l.quantity}</span></td><td>${l.reorderLevel}</td></tr>`).join("")}</table></div>` : '<div class="empty">All stock levels are healthy.</div>'}</div>
    <div class="card"><h3>Latest visits</h3><div class="tbl"><table>${s.recent.map(v => `<tr class="click" onclick="openPatient('${v.patientId}')"><td>${fmt(v.visitDate)}</td><td>${esc(nm("patients", v.patientId, "fullName"))}</td><td>${esc(v.diagnosis.join(", "))}</td></tr>`).join("")}</table></div></div>
  </div>`;
}

/* ---- patients ---- */
function patients(q = "") {
  setHead("Patients", `<button class="btn" onclick="patientForm()">Register patient</button>`);
  const rows = db.patients.filter(p => (p.fullName + p._id + p.allergies.join(" ") + p.chronicConditions.join(" ")).toLowerCase().includes(q.toLowerCase()));
  $("#view").innerHTML = `<input class="search" id="pq" placeholder="Search name, ID, allergy or condition" value="${esc(q)}">
  <div class="card tbl"><table><tr><th>ID</th><th>Name</th><th>Age</th><th>Blood</th><th>Allergies</th><th>Conditions</th><th>Home clinic</th></tr>
  ${rows.map(p => `<tr class="click" onclick="openPatient('${p._id}')"><td>${p._id}</td><td><b>${esc(p.fullName)}</b></td><td>${age(p.dateOfBirth)}</td><td>${esc(p.bloodGroup)}</td>
  <td>${p.allergies.map(a => `<span class="chip red">${esc(a)}</span>`).join("") || '<span class="muted">None</span>'}</td>
  <td>${p.chronicConditions.map(a => `<span class="chip amb">${esc(a)}</span>`).join("") || '<span class="muted">-</span>'}</td><td>${esc(nm("clinics", p.homeClinicId))}</td></tr>`).join("") || '<tr><td colspan="7" class="empty">No patients match. Register a new patient to begin.</td></tr>'}</table></div>`;
  const i = $("#pq"); i.oninput = () => { patients(i.value); const n = $("#pq"); n.focus(); n.setSelectionRange(99, 99); };
}
async function openPatient(id) {
  const p = await api(`/patients/${id}/history`);
  const clinicsSeen = [...new Set(p.visits.map(v => v.clinicId))].length;
  modal(p.fullName, `<p class="muted small">${p._id} &middot; ${age(p.dateOfBirth)} yrs &middot; ${p.gender === "F" ? "Female" : "Male"} &middot; ${esc(p.bloodGroup)} &middot; ${esc(p.phone)} &middot; ${esc(p.address?.village)}, ${esc(p.address?.district)}</p>
  ${p.allergies.length ? `<div class="alert bad">Allergies: ${p.allergies.map(esc).join(", ")}</div>` : '<div class="alert good">No known drug allergies.</div>'}
  ${p.pregnancyInfo ? `<div class="alert bad" style="background:var(--amberbg);color:#7a4e07;border-color:#efd39b">Pregnancy: due ${fmt(p.pregnancyInfo.expectedDeliveryDate)}, risk ${esc(p.pregnancyInfo.riskLevel)}</div>` : ""}
  ${p.guardian ? `<p class="small">Guardian: ${esc(p.guardian.name)} (${esc(p.guardian.relationship)}) ${esc(p.guardian.phone)}</p>` : ""}
  <p class="small">Emergency contact: ${esc(p.emergencyContact?.name)} (${esc(p.emergencyContact?.relationship)}) ${esc(p.emergencyContact?.phone)}</p>
  <h3 style="margin:16px 0 4px">Full history <span class="muted small">${p.visits.length} visits across ${clinicsSeen} clinic${clinicsSeen > 1 ? "s" : ""}</span></h3>
  <div class="timeline">${p.visits.map(v => `<div class="tl"><b>${fmt(v.visitDate)}</b> at ${esc(nm("clinics", v.clinicId))} with ${esc(nm("doctors", v.doctorId))}<br>
   <span class="chip">${esc(v.diagnosis.join("; "))}</span> <span class="muted small">${esc(v.complaint)}</span><br>
   <span class="small muted">Vitals: ${Object.entries(v.vitals || {}).map(([k, x]) => k + " " + x).join(", ") || "-"}</span>
   ${v.labTests.map(t => `<div class="small">Lab: ${esc(t.test)} - <b>${esc(t.result)}</b></div>`).join("")}
   ${v.prescriptions.map(r => `<div class="small">Rx: ${esc(nm("medicines", r.medicineId))}, ${esc(r.dosage)}, ${r.durationDays} days</div>`).join("")}</div>`).join("") || '<p class="empty">No visits yet.</p>'}</div>
  <div style="display:flex;gap:8px;margin-top:10px"><button class="btn" onclick="visitForm('${p._id}')">Record visit</button><button class="btn alt" onclick="patientForm('${p._id}')">Edit patient</button><button class="btn danger" onclick="del('patients','${p._id}')">Delete</button></div>`);
}
async function del(col, id) { if (!confirm(`Delete ${id}? This cannot be undone.`)) return; try { await api(`/${col}/${id}`, { method: "DELETE" }); await load(); closeModal(); render(); toast("Deleted " + id); } catch (e) { toast(e.message, true); } }
function patientForm(id) {
  const p = id ? by("patients", id) : { address: {}, emergencyContact: {}, allergies: [], chronicConditions: [] };
  closeModal();
  modal(id ? "Edit patient" : "Register patient", `<form id="f">
  <div class="row"><label>Full name<input name="fullName" required value="${esc(p.fullName)}"></label><label>Gender<select name="gender"><option>F</option><option ${p.gender === "M" ? "selected" : ""}>M</option></select></label>
  <label>Date of birth<input type="date" name="dateOfBirth" required value="${fmt(p.dateOfBirth) === "-" ? "" : fmt(p.dateOfBirth)}"></label></div>
  <div class="row"><label>Phone<input name="phone" value="${esc(p.phone)}"></label><label>Blood group<select name="bloodGroup">${["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map(b => `<option ${b === p.bloodGroup ? "selected" : ""}>${b}</option>`).join("")}</select></label>
  <label>Home clinic<select name="homeClinicId">${opts("clinics", "name", p.homeClinicId)}</select></label></div>
  <div class="row"><label>Village<input name="village" value="${esc(p.address?.village)}"></label><label>District<input name="district" value="${esc(p.address?.district)}"></label></div>
  <div class="row"><label>Drug allergies (comma separated)<input name="allergies" value="${esc(p.allergies.join(", "))}" placeholder="Penicillin, Aspirin"></label><label>Chronic conditions<input name="chronic" value="${esc(p.chronicConditions.join(", "))}"></label></div>
  <div class="row"><label>Emergency contact<input name="ecName" value="${esc(p.emergencyContact?.name)}"></label><label>Relationship<input name="ecRel" value="${esc(p.emergencyContact?.relationship)}"></label><label>Contact phone<input name="ecPhone" value="${esc(p.emergencyContact?.phone)}"></label></div>
  <button class="btn">Save patient</button></form>`);
  submitForm($("#f"), async f => {
    const doc = { fullName: f.fullName, gender: f.gender, dateOfBirth: f.dateOfBirth, phone: f.phone, bloodGroup: f.bloodGroup, homeClinicId: f.homeClinicId,
      address: { village: f.village, district: f.district }, allergies: list(f.allergies), chronicConditions: list(f.chronic), emergencyContact: { name: f.ecName, relationship: f.ecRel, phone: f.ecPhone } };
    if (id) await api("/patients/" + id, { method: "PUT", body: doc }); else await api("/patients", { method: "POST", body: { ...doc, registeredAt: fmt(new Date()) } });
    toast("Patient saved");
  });
}

/* ---- visits ---- */
function visits() {
  setHead("Visits", `<button class="btn" onclick="visitForm()">Record visit</button>`);
  const rows = [...db.visits].sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
  $("#view").innerHTML = `<div class="card tbl"><table><tr><th>ID</th><th>Date</th><th>Patient</th><th>Clinic</th><th>Doctor</th><th>Diagnosis</th><th>Rx</th><th>Fee</th></tr>
  ${rows.map(v => `<tr class="click" onclick="openPatient('${v.patientId}')"><td>${v._id}</td><td>${fmt(v.visitDate)}</td><td>${esc(nm("patients", v.patientId, "fullName"))}</td><td>${esc(nm("clinics", v.clinicId))}</td><td>${esc(nm("doctors", v.doctorId))}</td><td>${esc(v.diagnosis.join("; "))}</td><td>${v.prescriptions.length}</td><td>${v.consultationFee}</td></tr>`).join("")}</table></div>`;
}
function visitForm(pid) {
  closeModal();
  const rxRow = () => `<div class="rxrow"><select name="rxm"><option value="">Medicine...</option>${opts("medicines", "name")}</select><input name="rxd" placeholder="Dosage"><input name="rxn" type="number" placeholder="Days" min="1"><input name="rxq" type="number" placeholder="Qty" min="1"><button type="button" class="btn alt sm" onclick="this.parentElement.remove();checkSafety()">&times;</button></div>`;
  modal("Record visit", `<form id="f">
  <div class="row"><label>Patient<select name="patientId" id="vp" onchange="checkSafety()">${opts("patients", "fullName", pid)}</select></label><label>Clinic<select name="clinicId">${opts("clinics", "name")}</select></label><label>Doctor<select name="doctorId">${opts("doctors", "name")}</select></label></div>
  <div class="row"><label>Date<input type="date" name="visitDate" required value="${fmt(new Date())}"></label><label>Complaint<input name="complaint" required></label><label>Diagnosis (comma separated)<input name="diagnosis" required></label></div>
  <div class="row"><label>Temp &deg;C<input name="temperatureC" type="number" step="0.1"></label><label>BP systolic<input name="bpSystolic" type="number"></label><label>BP diastolic<input name="bpDiastolic" type="number"></label><label>Weight kg<input name="weightKg" type="number" step="0.1"></label><label>SpO2 %<input name="oxygenSaturation" type="number"></label></div>
  <label>Lab tests (one per line, "Test: Result")<textarea name="labs" style="min-height:60px"></textarea></label>
  <h3 style="margin:14px 0 8px;font-size:16px">Prescriptions</h3><div id="rxs">${rxRow()}</div><button type="button" class="btn alt sm" id="addrx">Add medicine</button>
  <div id="safety"></div>
  <div class="row" style="margin-top:12px"><label>Follow-up date<input type="date" name="followUpDate"></label><label>Consultation fee<input type="number" name="consultationFee" step="0.5" value="0"></label><label style="display:flex;gap:8px;align-items:center;margin-top:22px"><input type="checkbox" name="dispense" checked style="width:auto;margin:0"> Deduct from clinic stock</label></div>
  <button class="btn">Save visit</button></form>`);
  $("#addrx").onclick = () => { $("#rxs").insertAdjacentHTML("beforeend", rxRow()); };
  $("#rxs").onchange = checkSafety;
  checkSafety();
  submitForm($("#f"), async f => {
    const form = $("#f"), g = n => [...form.querySelectorAll(`[name=${n}]`)].map(e => e.value);
    const rxs = g("rxm").map((m, i) => ({ medicineId: m, dosage: g("rxd")[i], durationDays: +g("rxn")[i] || 0, quantity: +g("rxq")[i] || 0 })).filter(r => r.medicineId);
    for (const r of rxs) { const s = await api(`/safety?patientId=${f.patientId}&medicineId=${r.medicineId}`); if (!s.safe && !confirm(s.warnings.join("\n") + "\n\nSave anyway?")) throw new Error("Visit not saved"); }
    const vitals = {}; ["temperatureC", "bpSystolic", "bpDiastolic", "weightKg", "oxygenSaturation"].forEach(k => { if (f[k] !== "") vitals[k] = +f[k]; });
    const labTests = (f.labs || "").split("\n").filter(l => l.trim()).map(l => { const [t, ...r] = l.split(":"); return { test: t.trim(), result: r.join(":").trim() }; });
    await api("/visits", { method: "POST", body: { patientId: f.patientId, clinicId: f.clinicId, doctorId: f.doctorId, visitDate: f.visitDate, complaint: f.complaint, vitals, diagnosis: list(f.diagnosis), labTests, prescriptions: rxs, followUpDate: f.followUpDate || null, consultationFee: +f.consultationFee || 0 } });
    if (f.dispense) for (const r of rxs) await api(`/medicines/${r.medicineId}/stock`, { method: "POST", body: { clinicId: f.clinicId, delta: -r.quantity } }).catch(() => {});
    toast("Visit saved");
  });
}
async function checkSafety() {
  const box = $("#safety"); if (!box) return; const pid = $("#vp").value, ms = [...document.querySelectorAll("[name=rxm]")].map(e => e.value).filter(Boolean);
  const res = await Promise.all(ms.map(m => api(`/safety?patientId=${pid}&medicineId=${m}`)));
  const w = res.flatMap(r => r.warnings);
  box.innerHTML = w.length ? w.map(x => `<div class="alert bad">${esc(x)}</div>`).join("") : ms.length ? '<div class="alert good">No allergy conflicts found for this patient.</div>' : "";
}

/* ---- medicines ---- */
function medicines() {
  setHead("Medicines & stock", `<button class="btn" onclick="medForm()">Add medicine</button>`);
  $("#view").innerHTML = `<div class="cards">${db.medicines.map(m => `<div class="card"><h3>${esc(m.name)}</h3><p class="muted small" style="margin-top:-8px">${esc(m.form)}, ${esc(m.strength)} &middot; ${esc(m.category)} &middot; ${m.unitPrice}/unit</p>
  ${m.stock.map(s => { const low = s.quantity <= s.reorderLevel, pct = Math.min(100, s.quantity / (s.reorderLevel * 3) * 100); return `<div class="stock ${low ? "low" : ""}"><span style="flex:1">${esc(nm("clinics", s.clinicId).split(" ")[0])}</span><div class="t"><i style="width:${pct}%"></i></div><span style="width:46px;text-align:right">${s.quantity}</span><button class="btn alt sm" title="Adjust stock" onclick="adjust('${m._id}','${s.clinicId}')">+/-</button></div>`; }).join("") || '<p class="muted small">Not stocked anywhere yet.</p>'}
  <p class="small muted" style="margin-bottom:0">${m.contraindications.length ? "Avoid: " + esc(m.contraindications.join(", ")) : ""}</p>
  <div style="margin-top:8px"><button class="btn alt sm" onclick="stockLine('${m._id}')">Stock at another clinic</button></div></div>`).join("")}</div>`;
}
function adjust(id, cid) {
  closeModal(); modal(`Adjust stock: ${nm("medicines", id)} at ${nm("clinics", cid)}`, `<form id="f"><label>Change in quantity (use a negative number to dispense)<input name="delta" type="number" required autofocus></label><br><button class="btn">Update stock</button></form>`);
  submitForm($("#f"), async f => { await api(`/medicines/${id}/stock`, { method: "POST", body: { clinicId: cid, delta: f.delta } }); toast("Stock updated"); });
}
function stockLine(id) {
  const have = by("medicines", id).stock.map(s => s.clinicId); closeModal();
  modal("Add clinic stock", `<form id="f"><div class="row"><label>Clinic<select name="clinicId">${db.clinics.filter(c => !have.includes(c._id)).map(c => `<option value="${c._id}">${esc(c.name)}</option>`).join("")}</select></label><label>Quantity<input name="quantity" type="number" required></label><label>Reorder level<input name="reorderLevel" type="number" required></label><label>Expiry<input name="expiryDate" type="date" required></label></div><button class="btn">Add stock line</button></form>`);
  submitForm($("#f"), async f => { await api(`/medicines/${id}/stock-line`, { method: "POST", body: f }); toast("Stock added"); });
}
function medForm() {
  closeModal(); modal("Add medicine", `<form id="f"><div class="row"><label>Name<input name="name" required></label><label>Form<input name="form" placeholder="Tablet"></label><label>Strength<input name="strength" placeholder="500 mg"></label></div>
  <div class="row"><label>Category<input name="category"></label><label>Drug class (used for allergy checks)<input name="drugClass" placeholder="Penicillin"></label><label>Unit price<input name="unitPrice" type="number" step="0.01"></label></div>
  <label>Contraindications (comma separated)<input name="contra" placeholder="Penicillin allergy"></label><br><button class="btn">Save medicine</button></form>`);
  submitForm($("#f"), async f => { await api("/medicines", { method: "POST", body: { name: f.name, form: f.form, strength: f.strength, category: f.category, drugClass: f.drugClass, unitPrice: +f.unitPrice || 0, contraindications: list(f.contra), stock: [] } }); toast("Medicine added"); });
}

/* ---- clinics & doctors ---- */
function clinics() {
  setHead("Clinics & doctors", `<button class="btn alt" onclick="doctorForm()">Add doctor</button><button class="btn" onclick="clinicForm()">Add clinic</button>`);
  $("#view").innerHTML = `<div class="cards">${db.clinics.map(c => `<div class="card"><h3>${esc(c.name)}</h3><p class="muted small" style="margin-top:-8px">${esc(c.type)} &middot; ${esc(c.district)} &middot; ${c.beds} beds &middot; since ${c.openedYear}</p>
  <p class="small">${esc(c.address)}<br>${esc(c.phone)}</p>${(c.services || []).map(s => `<span class="chip gray">${esc(s)}</span>`).join("")}
  <p class="small"><b>Doctors</b></p>${db.doctors.filter(d => d.clinicId === c._id).map(d => `<div class="small">${esc(d.name)} <span class="muted">- ${esc(d.specialty)}, ${(d.availableDays || []).join("/")}</span></div>`).join("") || '<span class="muted small">None assigned</span>'}
  <p class="small muted" style="margin-bottom:0">${db.visits.filter(v => v.clinicId === c._id).length} visits &middot; ${db.patients.filter(p => p.homeClinicId === c._id).length} home patients</p></div>`).join("")}</div>`;
}
function clinicForm() {
  closeModal(); modal("Add clinic", `<form id="f"><div class="row"><label>Name<input name="name" required></label><label>Type<select name="type">${["Health Centre II", "Health Centre III", "Health Centre IV", "Mobile Clinic", "Hospital"].map(t => `<option>${t}</option>`).join("")}</select></label><label>District<input name="district" required></label></div>
  <div class="row"><label>Address<input name="address"></label><label>Phone<input name="phone"></label><label>Beds<input name="beds" type="number" value="0"></label><label>Year opened<input name="openedYear" type="number"></label></div>
  <div class="row"><label>Services (comma separated)<input name="services"></label><label>Longitude<input name="lng" type="number" step="any"></label><label>Latitude<input name="lat" type="number" step="any"></label></div><button class="btn">Save clinic</button></form>`);
  submitForm($("#f"), async f => { const doc = { name: f.name, type: f.type, district: f.district, address: f.address, phone: f.phone, beds: +f.beds || 0, openedYear: +f.openedYear || null, services: list(f.services) }; if (f.lng && f.lat) doc.location = { type: "Point", coordinates: [+f.lng, +f.lat] }; await api("/clinics", { method: "POST", body: doc }); toast("Clinic added"); });
}
function doctorForm() {
  closeModal(); modal("Add doctor", `<form id="f"><div class="row"><label>Name<input name="name" required></label><label>Specialty<input name="specialty"></label><label>Clinic<select name="clinicId">${opts("clinics", "name")}</select></label></div>
  <div class="row"><label>Licence no. (unique)<input name="licenseNo" required></label><label>Phone<input name="phone"></label><label>Email<input name="email" type="email"></label><label>Years of experience<input name="yearsExperience" type="number"></label></div>
  <label>Available days (comma separated)<input name="days" placeholder="Mon, Tue"></label><br><button class="btn">Save doctor</button></form>`);
  submitForm($("#f"), async f => { await api("/doctors", { method: "POST", body: { name: f.name, specialty: f.specialty, clinicId: f.clinicId, licenseNo: f.licenseNo, phone: f.phone, email: f.email, availableDays: list(f.days), yearsExperience: +f.yearsExperience || 0 } }); toast("Doctor added"); });
}

/* ---- developer console: raw JSON in, raw query out ---- */
function dev() {
  setHead("Developer console");
  const sample = JSON.stringify({ name: "Zinc Sulfate", form: "Tablet", strength: "20 mg", category: "Supplement", drugClass: "Mineral", contraindications: [], unitPrice: 0.06, stock: [] }, null, 2);
  $("#view").innerHTML = `<div class="grid g2">
  <div class="card"><h3>Insert raw documents</h3><p class="muted small">Paste one JSON object or an array. A missing <code>_id</code> is generated. Date-like strings (2026-05-01) become real dates.</p>
  <label>Collection<select id="dc">${["clinics", "doctors", "patients", "medicines", "visits"].map(c => `<option>${c}</option>`).join("")}</select></label><br>
  <label>Document(s)<textarea id="dj" style="min-height:200px">${esc(sample)}</textarea></label><br><button class="btn" id="dins">Insert into MongoDB</button><pre id="dout" style="margin-top:12px">// response appears here</pre></div>
  <div class="card"><h3>Query the database</h3><p class="muted small">Equivalent to <code>db.collection.find(filter)</code>. Try <code>{"allergies":"Penicillin"}</code> on patients.</p>
  <label>Collection<select id="qc">${["patients", "visits", "medicines", "clinics", "doctors"].map(c => `<option>${c}</option>`).join("")}</select></label><br>
  <label>Filter (JSON)<textarea id="qj" style="min-height:90px">{ "allergies": "Penicillin" }</textarea></label><br><button class="btn" id="dq">Run query</button><pre id="qout" style="margin-top:12px">// results appear here</pre></div></div>
  <div class="card" style="margin-top:16px"><h3>REST API</h3><pre>GET    /api/{clinics|doctors|patients|medicines|visits}
POST   /api/{collection}          body: JSON object or array
PUT    /api/{collection}/:id      body: fields to update
DELETE /api/{collection}/:id
GET    /api/patients/:id/history  full history across clinics ($lookup)
GET    /api/safety?patientId=&amp;medicineId=   allergy check
GET    /api/low-stock             re-order alerts ($unwind)
GET    /api/stats                 dashboard aggregations
GET    /api/clinics-near?lng=&amp;lat=   nearest clinics (2dsphere)</pre></div>`;
  $("#dins").onclick = async () => { try { const body = JSON.parse($("#dj").value); const r = await api("/" + $("#dc").value, { method: "POST", body }); $("#dout").textContent = JSON.stringify(r, null, 2); await load(); toast("Inserted"); } catch (e) { $("#dout").textContent = "Error: " + e.message; toast(e.message, true); } };
  $("#dq").onclick = async () => { try { const r = await api("/dev/find", { method: "POST", body: { collection: $("#qc").value, filter: JSON.parse($("#qj").value || "{}") } }); $("#qout").textContent = r.length + " document(s)\n\n" + JSON.stringify(r, null, 2); } catch (e) { $("#qout").textContent = "Error: " + e.message; } };
}

api("/mode").then(m=>{$("#dbmode").innerHTML=(m.mode==="mongodb"?"MongoDB":"Document store")+`<br><small>${esc(m.db)}</small>`}).catch(()=>{});
load().then(render).catch(e => { $("#view").innerHTML = `<div class="card"><h3>Cannot reach the API</h3><p>${esc(e.message)}. Open this page from <b>http://localhost:3000</b> after running <code>npm start</code> (do not double-click index.html).</p></div>`; });
