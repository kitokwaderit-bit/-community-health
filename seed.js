//kitokwa derick
const D = s => new Date(s);
const clinics = [
  { _id:"C001", name:"Riverside Community Clinic", type:"Health Centre III", district:"Riverside", address:"12 Market Road, Riverside", phone:"+000-700-100-001", openedYear:2009, beds:12, services:["Outpatient","Maternal Health","Immunisation","Laboratory"], location:{type:"Point",coordinates:[12.51,3.22]} },
  { _id:"C002", name:"Hillview Health Centre", type:"Health Centre IV", district:"Hillview", address:"4 Hill Top Rd, Hillview", phone:"+000-700-100-002", openedYear:2001, beds:40, services:["Outpatient","Maternity","Paediatrics","Laboratory","Pharmacy"], location:{type:"Point",coordinates:[12.58,3.3]} },
  { _id:"C003", name:"Lakeshore Mobile Clinic", type:"Mobile Clinic", district:"Lakeshore", address:"Mobile - lakeshore landing sites", phone:"+000-700-100-003", openedYear:2016, beds:0, services:["Outpatient","Outreach"], location:{type:"Point",coordinates:[12.7,3.1]} },
  { _id:"C004", name:"Greenfield Family Clinic", type:"Health Centre II", district:"Greenfield", address:"88 Farm Lane, Greenfield", phone:"+000-700-100-004", openedYear:2012, beds:6, services:["Outpatient","Immunisation"], location:{type:"Point",coordinates:[12.4,3.4]} },
  { _id:"C005", name:"Sunrise Community Clinic", type:"Health Centre III", district:"Sunrise", address:"1 East Avenue, Sunrise", phone:"+000-700-100-005", openedYear:2014, beds:10, services:["Outpatient","Laboratory","Family Planning"], location:{type:"Point",coordinates:[12.65,3.35]} }
];
const doctors = [
  { _id:"D001", name:"Dr. Amina Yusuf", specialty:"General Practice", clinicId:"C001", licenseNo:"MD-10234", phone:"+000-711-200-001", email:"amina.yusuf@example.org", availableDays:["Mon","Tue","Thu"], yearsExperience:9 },
  { _id:"D002", name:"Dr. Daniel Okello", specialty:"Paediatrics", clinicId:"C002", licenseNo:"MD-10871", phone:"+000-711-200-002", email:"daniel.okello@example.org", availableDays:["Mon","Wed","Fri"], yearsExperience:12 },
  { _id:"D003", name:"Dr. Grace Mwangi", specialty:"Obstetrics", clinicId:"C002", licenseNo:"MD-11540", phone:"+000-711-200-003", email:"grace.mwangi@example.org", availableDays:["Tue","Thu"], yearsExperience:15 },
  { _id:"D004", name:"Dr. Samuel Tembo", specialty:"General Practice", clinicId:"C003", licenseNo:"MD-12019", phone:"+000-711-200-004", email:"samuel.tembo@example.org", availableDays:["Sat","Sun"], yearsExperience:6 },
  { _id:"D005", name:"Dr. Lucy Njoroge", specialty:"Internal Medicine", clinicId:"C004", licenseNo:"MD-09877", phone:"+000-711-200-005", email:"lucy.njoroge@example.org", availableDays:["Mon","Tue","Wed","Thu"], yearsExperience:18 },
  { _id:"D006", name:"Dr. Peter Banda", specialty:"General Practice", clinicId:"C005", licenseNo:"MD-12456", phone:"+000-711-200-006", email:"peter.banda@example.org", availableDays:["Wed","Fri"], yearsExperience:4 }
];
const ec = (name,relationship,phone)=>({name,relationship,phone});
const patients = [
  { _id:"P001", fullName:"Joan Achieng", gender:"F", dateOfBirth:D("1990-04-12"), phone:"+000-722-300-001", bloodGroup:"O+", address:{village:"Riverbend",district:"Riverside"}, allergies:["Penicillin"], chronicConditions:["Hypertension"], homeClinicId:"C001", registeredAt:D("2025-11-02"), emergencyContact:ec("Peter Achieng","Husband","+000-722-300-101") },
  { _id:"P002", fullName:"Brian Kato", gender:"M", dateOfBirth:D("1985-09-30"), phone:"+000-722-300-002", bloodGroup:"A+", address:{village:"Market Town",district:"Riverside"}, allergies:[], chronicConditions:["Type 2 Diabetes"], homeClinicId:"C001", registeredAt:D("2025-11-15"), emergencyContact:ec("Ruth Kato","Wife","+000-722-300-102") },
  { _id:"P003", fullName:"Fatima Hassan", gender:"F", dateOfBirth:D("2018-02-20"), phone:"+000-722-300-003", bloodGroup:"B+", address:{village:"Hill Top",district:"Hillview"}, allergies:["Sulfa drugs"], chronicConditions:[], homeClinicId:"C002", registeredAt:D("2025-12-01"), guardian:{name:"Aisha Hassan",relationship:"Mother",phone:"+000-722-300-103"}, emergencyContact:ec("Aisha Hassan","Mother","+000-722-300-103") },
  { _id:"P004", fullName:"Moses Ssemakula", gender:"M", dateOfBirth:D("1962-11-05"), phone:"+000-722-300-004", bloodGroup:"O-", address:{village:"Green Valley",district:"Greenfield"}, allergies:["Penicillin","Aspirin"], chronicConditions:["Asthma"], homeClinicId:"C004", registeredAt:D("2025-12-12"), emergencyContact:ec("Agnes Ssemakula","Daughter","+000-722-300-104") },
  { _id:"P005", fullName:"Esther Nambi", gender:"F", dateOfBirth:D("1998-07-18"), phone:"+000-722-300-005", bloodGroup:"AB+", address:{village:"Hill Top",district:"Hillview"}, allergies:[], chronicConditions:[], homeClinicId:"C002", registeredAt:D("2026-01-10"), pregnancyInfo:{expectedDeliveryDate:D("2026-07-15"),gravida:1,riskLevel:"Low"}, emergencyContact:ec("John Nambi","Brother","+000-722-300-105") },
  { _id:"P006", fullName:"David Otieno", gender:"M", dateOfBirth:D("1975-01-25"), phone:"+000-722-300-006", bloodGroup:"A-", address:{village:"Fishers Cove",district:"Lakeshore"}, allergies:["Latex"], chronicConditions:[], homeClinicId:"C003", registeredAt:D("2026-02-01"), emergencyContact:ec("Mercy Otieno","Wife","+000-722-300-106") },
  { _id:"P007", fullName:"Mary Chebet", gender:"F", dateOfBirth:D("2005-12-03"), phone:"+000-722-300-007", bloodGroup:"O+", address:{village:"East End",district:"Sunrise"}, allergies:[], chronicConditions:[], homeClinicId:"C005", registeredAt:D("2026-03-05"), emergencyContact:ec("Joyce Chebet","Mother","+000-722-300-107") }
];
const st = (clinicId,quantity,reorderLevel,exp)=>({clinicId,quantity,reorderLevel,expiryDate:D(exp)});
const medicines = [
  { _id:"M001", name:"Amoxicillin", form:"Capsule", strength:"500 mg", category:"Antibiotic", drugClass:"Penicillin", contraindications:["Penicillin allergy"], unitPrice:0.15, stock:[st("C001",40,50,"2027-03-31"),st("C002",220,50,"2027-06-30"),st("C004",15,30,"2027-01-31")] },
  { _id:"M002", name:"Paracetamol", form:"Tablet", strength:"500 mg", category:"Analgesic", drugClass:"Analgesic", contraindications:["Severe liver disease"], unitPrice:0.03, stock:[st("C001",500,100,"2028-02-28"),st("C002",900,150,"2028-01-31"),st("C003",80,100,"2027-11-30"),st("C004",300,100,"2027-12-31"),st("C005",250,100,"2028-03-31")] },
  { _id:"M003", name:"Amlodipine", form:"Tablet", strength:"5 mg", category:"Antihypertensive", drugClass:"Calcium channel blocker", contraindications:["Severe aortic stenosis"], unitPrice:0.08, stock:[st("C001",160,40,"2027-09-30"),st("C002",200,40,"2027-10-31"),st("C004",20,40,"2027-08-31")] },
  { _id:"M004", name:"Metformin", form:"Tablet", strength:"500 mg", category:"Antidiabetic", drugClass:"Biguanide", contraindications:["Severe kidney disease"], unitPrice:0.05, stock:[st("C001",300,60,"2027-12-31"),st("C002",350,60,"2028-01-31"),st("C005",10,40,"2027-07-31")] },
  { _id:"M005", name:"Artemether-Lumefantrine", form:"Tablet", strength:"20/120 mg", category:"Antimalarial", drugClass:"Artemisinin", contraindications:["First trimester pregnancy"], unitPrice:0.9, stock:[st("C002",150,60,"2027-05-31"),st("C003",35,60,"2027-04-30"),st("C005",90,60,"2027-06-30")] },
  { _id:"M006", name:"Salbutamol Inhaler", form:"Inhaler", strength:"100 mcg/dose", category:"Bronchodilator", drugClass:"Beta-2 agonist", contraindications:[], unitPrice:2.5, stock:[st("C002",30,10,"2027-02-28"),st("C004",4,10,"2027-03-31")] },
  { _id:"M007", name:"Ferrous Sulfate", form:"Tablet", strength:"200 mg", category:"Supplement", drugClass:"Iron", contraindications:["Haemochromatosis"], unitPrice:0.04, stock:[st("C002",400,100,"2028-04-30"),st("C005",120,80,"2028-02-29")] }
];
const rx = (medicineId,dosage,durationDays,quantity)=>({medicineId,dosage,durationDays,quantity});
const v = (_id,patientId,clinicId,doctorId,date,complaint,vitals,diagnosis,labTests,prescriptions,follow,fee)=>({_id,patientId,clinicId,doctorId,visitDate:D(date),complaint,vitals,diagnosis,labTests,prescriptions,followUpDate:follow?D(follow):null,consultationFee:fee});
const visits = [
  v("V001","P001","C001","D001","2026-01-14","Headaches and dizziness",{bpSystolic:158,bpDiastolic:98,weightKg:72},["Hypertension (uncontrolled)"],[],[rx("M003","1 tablet daily",30,30)],"2026-02-14",5),
  v("V002","P002","C001","D001","2026-02-03","Routine diabetes review",{bpSystolic:130,bpDiastolic:84,weightKg:88},["Type 2 Diabetes (follow-up)"],[{test:"Fasting glucose",result:"8.1 mmol/L"}],[rx("M004","1 tablet twice daily",30,60)],"2026-03-03",5),
  v("V003","P003","C002","D002","2026-02-20","Fever and chills for two days",{temperatureC:39.1,weightKg:19},["Malaria (uncomplicated)"],[{test:"Malaria RDT",result:"Positive"}],[rx("M005","1 tablet twice daily",3,6),rx("M002","250 mg every 6 hours",3,6)],"2026-02-27",3),
  v("V004","P004","C004","D005","2026-03-09","Wheezing and shortness of breath",{temperatureC:37.2,oxygenSaturation:91,weightKg:70},["Asthma exacerbation"],[],[rx("M006","2 puffs as needed",30,1)],"2026-03-23",6),
  v("V005","P005","C002","D003","2026-03-25","Antenatal check-up",{bpSystolic:112,bpDiastolic:70,weightKg:64},["Normal pregnancy (24 weeks)","Mild anaemia"],[{test:"Haemoglobin",result:"10.2 g/dL"}],[rx("M007","1 tablet daily",30,30)],"2026-04-22",4),
  v("V006","P006","C003","D004","2026-04-11","Cough and sore throat",{temperatureC:37.9,weightKg:80},["Upper respiratory tract infection"],[],[rx("M002","2 tablets every 8 hours",5,30)],null,2),
  v("V007","P001","C001","D001","2026-02-16","Blood pressure review",{bpSystolic:142,bpDiastolic:90,weightKg:71},["Hypertension (improving)"],[],[rx("M003","1 tablet daily",30,30)],"2026-03-16",5),
  v("V008","P007","C005","D006","2026-05-06","Fatigue and pallor",{weightKg:55},["Anaemia"],[{test:"Haemoglobin",result:"9.4 g/dL"}],[rx("M007","1 tablet daily",30,30)],"2026-06-06",3),
  v("V009","P004","C004","D005","2026-06-18","Persistent cough",{temperatureC:38.0,oxygenSaturation:94},["Acute bronchitis"],[],[rx("M002","2 tablets every 8 hours",5,30)],null,6),
  v("V010","P002","C005","D006","2026-07-22","Diabetes review while travelling",{bpSystolic:128,bpDiastolic:82,weightKg:86},["Type 2 Diabetes (follow-up)"],[{test:"Random glucose",result:"7.4 mmol/L"}],[rx("M004","1 tablet twice daily",30,60)],"2026-08-22",3),
  v("V011","P003","C002","D002","2026-09-02","Routine immunisation",{weightKg:21},["Healthy child - immunisation"],[],[],null,1)
];
const data = { clinics, doctors, patients, medicines, visits };

async function seed(db, { reset = false } = {}) {
  for (const [name, docs] of Object.entries(data)) {
    const col = db.collection(name);
    if (reset) await col.deleteMany({});
    if (await col.countDocuments() === 0) await col.insertMany(docs);
  }
  if (typeof db.command !== "function") return; // embedded store: no indexes/validation
  await db.collection("patients").createIndex({ allergies: 1 });
  await db.collection("patients").createIndex({ homeClinicId: 1 });
  await db.collection("visits").createIndex({ patientId: 1, visitDate: -1 });
  await db.collection("visits").createIndex({ clinicId: 1 });
  await db.collection("medicines").createIndex({ "stock.clinicId": 1 });
  await db.collection("doctors").createIndex({ licenseNo: 1 }, { unique: true });
  await db.collection("clinics").createIndex({ location: "2dsphere" });
  try {
    await db.command({ collMod: "patients", validationLevel: "moderate", validator: { $jsonSchema: {
      bsonType: "object", required: ["fullName","gender","dateOfBirth","homeClinicId"],
      properties: { fullName:{bsonType:"string"}, gender:{enum:["M","F"]}, dateOfBirth:{bsonType:"date"},
        homeClinicId:{bsonType:"string"}, allergies:{bsonType:"array",items:{bsonType:"string"}} } } } });
  } catch (e) { console.warn("Validation not applied:", e.message); }
}
module.exports = { seed, data };

if (require.main === module) {
  const { MongoClient } = require("mongodb");
  (async () => {
    const c = await MongoClient.connect(process.env.MONGO_URI || "mongodb://localhost:27017");
    const db = c.db(process.env.DB_NAME || "community_health");
    await seed(db, { reset: process.argv.includes("--reset") });
    for (const n of Object.keys(data)) console.log(n, await db.collection(n).countDocuments());
    await c.close();
  })();
}
