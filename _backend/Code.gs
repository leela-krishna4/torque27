/**
 * TORQUE 2K27 - Registration + Payments backend (Google Apps Script)
 * Supports BOTH payment modes from the same script:
 *   - Razorpay  (page sends mode "razorpay")
 *   - UPI QR + UTR, verified by the treasurer in the Sheet (page sends mode "upi")
 * The server is the only source of truth for prices, IDs and payment status.
 * Keys live in Project Settings > Script properties, never in code or on the page.
 */
var CFG = {
  EVENT_PRICE: 100,          // Rs per event      <-- CHANGE ME
  WORKSHOP_PRICE: 200,       // Rs per workshop   <-- CHANGE ME
  UPI_ID: "yourupi@bank",    // UPI mode: where students pay  <-- CHANGE ME
  UPI_NAME: "Torque 2K27",
  SHEET: "Registrations",
  RATE_LIMIT: 8,             // max attempts per email / phone per 10 minutes
  ADMIN_EMAIL: "",           // optional: get an email for each UPI payment to verify
  EVENTS: ["Mechanical Quiz","Design Freak","Project Expo","Bridge Building","Lathe Master","Casting Crowns","Slide Plane","Engine Montage","Chess Monarch","Robo Race (MazeX)","Drone Drive","Rhythmic Fusion"],
  WORKSHOPS: ["Electric Vehicles","Virtual Reality","Robotics"],
  BRANCHES: ["Mechanical","Civil","Electrical (EEE)","Electronics (ECE)","Computer Science","Chemical","Other"],
  YEARS: ["1st year","2nd year","3rd year","4th year","Other"]
};
var HEAD = ["regId","time","status","amount","name","email","phone","college","roll","branch","year","city","events","workshops","team","accommodation","notes","mode","orderId","paymentId","utr","verifiedAt"];
var S_PENDING = "Pending", S_PAID = "Paid", S_UTR = "UTR submitted", S_VER = "Verified", S_REJ = "Rejected";
var STATUSES = [S_PENDING, S_PAID, S_UTR, S_VER, S_REJ];

/* ---------- entry points ---------- */
function doGet() { return out({ ok: true, service: "torque-2k27" }); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    var b = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (b.action === "init") return out(actInit(b));
    if (b.action === "verify") return out(actVerify(b));
    if (b.action === "utr") return out(actUtr(b));
    throw UE("Unknown request.");
  } catch (err) {
    if (err && err.user) return out({ ok: false, error: err.message });
    console.error(err && err.stack || err);
    return out({ ok: false, error: "Something went wrong. Please try again." });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* ---------- actions ---------- */
function actInit(b) {
  var mode = b.mode === "upi" ? "upi" : "razorpay";
  var d = clean(b.data);
  rateLimit("e:" + d.email); rateLimit("p:" + d.phone);
  var amount = d.events.length * CFG.EVENT_PRICE + d.workshops.length * CFG.WORKSHOP_PRICE;   // server decides the price
  if (amount <= 0) throw UE("Pick at least one event or workshop.");

  var sh = sheet(), data = sh.getDataRange().getValues(), reuse = -1, regId = "";
  for (var i = 1; i < data.length; i++) {
    var r = data[i], same = String(r[col("email")]).toLowerCase() === d.email || String(r[col("phone")]) === d.phone;
    if (!same) continue;
    var st = r[col("status")];
    if (st === S_PAID || st === S_VER || st === S_UTR) throw UE("This email or mobile number is already registered.");
    if (st === S_PENDING && String(r[col("email")]).toLowerCase() === d.email && String(r[col("phone")]) === d.phone) { reuse = i + 1; regId = r[col("regId")]; }
  }
  if (!regId) regId = newId(data);

  var orderId = "";
  if (mode === "razorpay") {
    var o = rzp("post", "/orders", { amount: amount * 100, currency: "INR", receipt: regId, notes: { regId: regId, email: d.email } });
    orderId = o.id;
  }
  var row = HEAD.map(function (h) {
    var m = { regId: regId, time: new Date().toISOString(), status: S_PENDING, amount: amount, name: d.name, email: d.email, phone: d.phone, college: d.college, roll: d.roll, branch: d.branch, year: d.year, city: d.city,
      events: d.events.join("; "), workshops: d.workshops.join("; "), team: d.team, accommodation: d.accommodation, notes: d.notes, mode: mode, orderId: orderId, paymentId: "", utr: "", verifiedAt: "" };
    return cell(m[h]);
  });
  if (reuse > 0) sh.getRange(reuse, 1, 1, HEAD.length).setValues([row]); else sh.appendRow(row);

  if (mode === "razorpay") return { ok: true, regId: regId, amount: amount, orderId: orderId, keyId: prop("RZP_KEY_ID") };
  return { ok: true, regId: regId, amount: amount, upiId: CFG.UPI_ID, upiName: CFG.UPI_NAME };
}

function actVerify(b) {
  var regId = str(b.regId, 20), email = str(b.email, 120).toLowerCase();
  var oid = str(b.razorpay_order_id, 60), pid = str(b.razorpay_payment_id, 60), sig = str(b.razorpay_signature, 100);
  if (!/^T27-[A-Z0-9]{5}$/.test(regId) || !/^order_\w+$/.test(oid) || !/^pay_\w+$/.test(pid) || !/^[a-f0-9]{64}$/.test(sig)) throw UE("Invalid payment details.");
  var sh = sheet(), f = findRow(sh, regId);
  if (!f || String(f.row[col("email")]).toLowerCase() !== email || f.row[col("mode")] !== "razorpay") throw UE("Registration not found.");
  if (f.row[col("status")] === S_PAID && f.row[col("paymentId")] === pid) return { ok: true, regId: regId };   // repeat call
  if (f.row[col("status")] !== S_PENDING) throw UE("This registration is not awaiting payment.");
  if (f.row[col("orderId")] !== oid) throw UE("Order mismatch.");

  var secret = prop("RZP_KEY_SECRET");
  if (!secret) throw UE("Payments are not configured yet.");
  if (!safeEq(hmacHex(oid + "|" + pid, secret), sig)) throw UE("Payment signature check failed.");
  // second, independent check straight from Razorpay
  var p = rzp("get", "/payments/" + pid);
  if (p.order_id !== oid || Number(p.amount) !== Number(f.row[col("amount")]) * 100) throw UE("Payment amount mismatch.");
  if (p.status === "authorized") p = rzp("post", "/payments/" + pid + "/capture", { amount: p.amount, currency: "INR" });
  if (p.status !== "captured") throw UE("Payment is not completed yet.");
  // the same payment can never unlock two registrations
  var all = sh.getDataRange().getValues();
  for (var i = 1; i < all.length; i++) if (all[i][col("paymentId")] === pid && all[i][col("regId")] !== regId) throw UE("This payment was already used.");

  markPaid(sh, f.idx, f.row, pid);
  return { ok: true, regId: regId };
}

function actUtr(b) {
  var regId = str(b.regId, 20), email = str(b.email, 120).toLowerCase(), utr = str(b.utr, 20);
  if (!/^T27-[A-Z0-9]{5}$/.test(regId)) throw UE("Invalid registration.");
  if (!/^\d{12}$/.test(utr)) throw UE("Enter the 12-digit UTR number from your UPI app.");
  var sh = sheet(), f = findRow(sh, regId);
  if (!f || String(f.row[col("email")]).toLowerCase() !== email || f.row[col("mode")] !== "upi") throw UE("Registration not found.");
  if (f.row[col("status")] !== S_PENDING) throw UE("A payment was already submitted for this registration.");
  var all = sh.getDataRange().getValues();
  for (var i = 1; i < all.length; i++) if (String(all[i][col("utr")]) === utr) throw UE("This UTR was already used.");
  sh.getRange(f.idx, col("utr") + 1).setValue(utr);
  sh.getRange(f.idx, col("status") + 1).setValue(S_UTR);
  if (CFG.ADMIN_EMAIL) try { MailApp.sendEmail(CFG.ADMIN_EMAIL, "Torque: verify UPI payment " + regId, regId + " | Rs " + f.row[col("amount")] + " | UTR " + utr + " | " + f.row[col("name")]); } catch (x) {}
  return { ok: true, regId: regId };
}

/* ---------- admin side (run from the Sheet) ---------- */
function setup() {                      // run ONCE from the editor
  var sh = sheet(), n = HEAD.length;
  sh.getRange(1, 1, 1, n).setValues([HEAD]).setFontWeight("bold");
  sh.setFrozenRows(1);
  sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, 1), n).setNumberFormat("@");
  sh.getRange(2, col("status") + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build());
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("onSheetEdit").forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  ScriptApp.newTrigger("reconcile").timeBased().everyMinutes(10).create();
}

function onSheetEdit(e) {               // treasurer sets Status = Verified for a UPI payment -> pass email goes out
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() !== CFG.SHEET || e.range.getColumn() !== col("status") + 1 || e.range.getRow() < 2) return;
  var idx = e.range.getRow(), row = sh.getRange(idx, 1, 1, HEAD.length).getValues()[0];
  if (e.value === S_VER && row[col("mode")] === "upi" && !row[col("verifiedAt")]) {
    sh.getRange(idx, col("verifiedAt") + 1).setValue(new Date().toISOString());
    sendPass(row);
  }
}

function reconcile() {                  // safety net: pays that finished but whose browser never came back
  var sh = sheet(), data = sh.getDataRange().getValues(), cutoff = Date.now() - 3 * 86400000;
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    if (r[col("status")] !== S_PENDING || r[col("mode")] !== "razorpay" || !r[col("orderId")] || Date.parse(r[col("time")]) < cutoff) continue;
    try {
      var list = rzp("get", "/orders/" + r[col("orderId")] + "/payments");
      (list.items || []).forEach(function (p) {
        if (r[col("status")] === S_PENDING && p.status === "captured" && Number(p.amount) === Number(r[col("amount")]) * 100) { markPaid(sh, i + 1, r, p.id); r[col("status")] = S_PAID; }
      });
    } catch (err) { console.error(err); }
  }
}

/* ---------- helpers ---------- */
function UE(m) { var e = new Error(m); e.user = true; return e; }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function prop(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function str(v, max) { return String(v == null ? "" : v).trim().slice(0, max); }
function col(n) { return HEAD.indexOf(n); }
function cell(v) { v = String(v == null ? "" : v); return /^[=+\-@\t\r]/.test(v) ? "'" + v : v; }   // stops spreadsheet formula injection
function sheet() {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(CFG.SHEET) || ss.insertSheet(CFG.SHEET);
  if (sh.getLastRow() === 0) sh.appendRow(HEAD);
  return sh;
}
function findRow(sh, regId) {
  var d = sh.getDataRange().getValues();
  for (var i = 1; i < d.length; i++) if (d[i][col("regId")] === regId) return { idx: i + 1, row: d[i] };
  return null;
}
function newId(data) {
  var c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", id, used;
  do {
    id = "T27-"; for (var i = 0; i < 5; i++) id += c.charAt(Math.floor(Math.random() * c.length));
    used = data.some(function (r) { return r[0] === id; });
  } while (used);
  return id;
}
function rateLimit(key) {
  var cache = CacheService.getScriptCache(), k = "rl_" + key, n = Number(cache.get(k) || 0);
  if (n >= CFG.RATE_LIMIT) throw UE("Too many attempts. Please wait a few minutes and try again.");
  cache.put(k, String(n + 1), 600);
}
function hmacHex(msg, secret) {
  return Utilities.computeHmacSha256Signature(msg, secret).map(function (b) { return ("0" + ((b < 0 ? b + 256 : b) & 255).toString(16)).slice(-2); }).join("");
}
function safeEq(a, b) {
  if (a.length !== b.length) return false;
  var x = 0; for (var i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
function rzp(method, path, body) {
  var id = prop("RZP_KEY_ID"), sec = prop("RZP_KEY_SECRET");
  if (!id || !sec) throw UE("Payments are not configured yet.");
  var opt = { method: method, headers: { Authorization: "Basic " + Utilities.base64Encode(id + ":" + sec) }, muteHttpExceptions: true };
  if (body) { opt.contentType = "application/json"; opt.payload = JSON.stringify(body); }
  var r = UrlFetchApp.fetch("https://api.razorpay.com/v1" + path, opt), j = {};
  try { j = JSON.parse(r.getContentText()); } catch (x) {}
  if (r.getResponseCode() >= 300) { console.error("Razorpay " + r.getResponseCode() + " " + r.getContentText()); throw UE("Payment service error. Please try again."); }
  return j;
}
function markPaid(sh, idx, row, pid) {
  sh.getRange(idx, col("status") + 1).setValue(S_PAID);
  sh.getRange(idx, col("paymentId") + 1).setValue(pid);
  sh.getRange(idx, col("verifiedAt") + 1).setValue(new Date().toISOString());
  sendPass(row);
}
function sendPass(row) {
  try {
    MailApp.sendEmail(String(row[col("email")]), "Torque 2K27 - your registration " + row[col("regId")],
      "Hi " + row[col("name")] + ",\n\nYour registration for Torque 2K27 is confirmed.\n\nRegistration ID: " + row[col("regId")] +
      "\nAmount: Rs " + row[col("amount")] + "\nEvents: " + (row[col("events")] || "-") + "\nWorkshops: " + (row[col("workshops")] || "-") +
      "\nDates: 10-11 January 2027, UCEK JNTUK\n\nShow this ID at the registration desk.\n\nTeam Torque", { name: "Torque 2K27" });
  } catch (e) { console.error(e); }
}
function clean(d) {
  if (!d || typeof d !== "object") throw UE("Invalid form.");
  var o = {
    name: str(d.name, 80), email: str(d.email, 120).toLowerCase(), phone: str(d.phone, 10), college: str(d.college, 120),
    roll: str(d.roll, 30), branch: str(d.branch, 40), year: str(d.year, 20), city: str(d.city, 60),
    team: str(d.team, 500), notes: str(d.notes, 500), accommodation: d.accommodation === "Yes" ? "Yes" : "No"
  };
  if (o.name.length < 3 || !/^[A-Za-z][A-Za-z .'\-]*$/.test(o.name)) throw UE("Enter your full name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) throw UE("Enter a valid email.");
  if (!/^[6-9]\d{9}$/.test(o.phone)) throw UE("Enter a valid 10-digit mobile number.");
  if (o.college.length < 3) throw UE("Enter your college name.");
  if (CFG.BRANCHES.indexOf(o.branch) < 0 || CFG.YEARS.indexOf(o.year) < 0) throw UE("Select your branch and year.");
  o.events = uniq(d.events, CFG.EVENTS); o.workshops = uniq(d.workshops, CFG.WORKSHOPS);
  return o;
}
function uniq(a, allowed) {
  if (!Array.isArray(a)) return [];
  var seen = {}, r = [];
  a.forEach(function (x) {
    x = String(x);
    if (allowed.indexOf(x) < 0) throw UE("Unknown event selected.");
    if (!seen[x]) { seen[x] = 1; r.push(x); }
  });
  return r;
}
