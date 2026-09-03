const escape = (value) =>
  String(value ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const row = (label, value) =>
  `<div class="detail"><b>${label}</b><span>${escape(value)}</span></div>`;

export function printPrescription({
  visit,
  patient,
  clinicSettings,
  form = {},
}) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.opener = null;
  const vitals = form.vitals || visit.vitals || {};
  const medicines = form.medicines || visit.medicines || [];
  const diagnosis = form.diagnosis || visit.diagnosis || "";
  const notes = form.notes || visit.notes || visit.symptoms || "";
  const date =
    visit.appointmentDate ||
    new Date(visit.createdAt || Date.now()).toLocaleDateString();
  const vitalRows = [
    ["Temperature", vitals.temperature && `${vitals.temperature} °F`],
    ["Pulse", vitals.pulse && `${vitals.pulse} bpm`],
    ["BP", vitals.systolic && `${vitals.systolic}/${vitals.diastolic || "—"}`],
    ["SpO₂", vitals.spo2 && `${vitals.spo2}%`],
    ["Weight", vitals.weight && `${vitals.weight} kg`],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `<span>${escape(label)}: ${escape(value)}</span>`)
    .join("");
  const medicineRows = medicines.length
    ? medicines
        .map(
          (medicine, index) =>
            `<tr><td>${index + 1}</td><td>${escape(medicine.name)}</td><td>${escape(medicine.dosage || "As directed")}</td><td>${escape(medicine.days ? `${medicine.days} day(s)` : "—")}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="4">No medicines prescribed</td></tr>`;

  printWindow.document
    .write(`<!doctype html><html><head><title>OPD Prescription</title><style>
    @page{size:A4;margin:10mm}*{box-sizing:border-box}body{margin:0;color:#151515;font:11px Arial,sans-serif}main{width:190mm;min-height:277mm;margin:auto}.clinic-header{min-height:24mm;display:flex;align-items:center;gap:10px;border-bottom:1px solid #aaa;padding:2mm 3mm}.clinic-header img{width:23mm;height:20mm;object-fit:contain}.clinic-name{color:#213b80;font-size:24px;font-weight:800;line-height:1;text-transform:uppercase}.clinic-subtitle{font-size:12px;font-weight:700}.clinic-contact{margin-left:auto;color:#555;font-size:9px;line-height:1.6;text-align:right}h1{font-size:13px;text-align:center;margin:12mm 0 4mm}.patient-area{display:grid;grid-template-columns:1.45fr 1fr;gap:12mm;padding:0 2mm 5mm;font-size:10px;line-height:1.55}.detail b{display:inline-block;min-width:28mm;font-size:9px}.detail span{font-weight:600}.vitals{border-top:1px solid #777;border-bottom:1px solid #777;padding:3mm 2mm;margin-bottom:4mm;display:flex;gap:10mm;flex-wrap:wrap;font-size:10px}.rx-box{border:1.5px solid #222;min-height:165mm;padding:3mm 5mm}.rx-title{font-family:cursive;font-size:14px}.section-title{font-size:10px;font-weight:800;text-transform:uppercase;margin:6mm 0 2mm}.notes{white-space:pre-wrap;line-height:1.6}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #777;padding:2mm;text-align:left}th{background:#eee}.signature{margin-top:45mm;text-align:right;font-size:10px}footer{border-top:1px solid #aaa;padding-top:3mm;margin-top:3mm;font-size:8px;color:#666;display:flex;justify-content:space-between}
    </style></head><body><main><div class="clinic-header">${clinicSettings.logoUrl ? `<img src="${escape(clinicSettings.logoUrl)}" alt="Clinic logo">` : ""}<div><div class="clinic-name">${escape(clinicSettings.clinicName)}</div><div class="clinic-subtitle">OPD &amp; PRESCRIPTION SERVICES</div></div><div class="clinic-contact">${escape(clinicSettings.address || "")}<br>${escape(clinicSettings.phone || "")}<br>${escape(clinicSettings.email || "")}</div></div><h1>OPD PRESCRIPTION</h1><section class="patient-area"><div>${row("UHID NO.", visit.patientId)}${row("PATIENT NAME", visit.patientName)}${row("AGE / SEX", patient ? `${patient.age || "—"} / ${patient.gender || "—"}` : "—")}${row("MOB. NO.", patient?.phone)}${row("DEPARTMENT", visit.department)}</div><div>${row("OPD DATE", date)}${row("STATUS", visit.status || "Completed")}${row("DOCTOR", visit.doctor)}${row("TIME", visit.appointmentTime || "—")}</div></section>${vitalRows ? `<div class="vitals">${vitalRows}</div>` : ""}<section class="rx-box"><div class="rx-title">Rx</div><div class="section-title">Diagnosis</div><div class="notes">${escape(diagnosis || "—")}</div><div class="section-title">Prescription</div><table><thead><tr><th>#</th><th>Medicine</th><th>Dosage</th><th>Duration</th></tr></thead><tbody>${medicineRows}</tbody></table><div class="section-title">Clinical notes</div><div class="notes">${escape(notes)}</div><div class="signature">Doctor signature<br><br>________________________</div></section><footer><span>Generated from ${escape(clinicSettings.clinicName)}</span><span>Please carry this prescription for your consultation.</span></footer></main><script>window.onload=()=>window.print()<\/script></body></html>`);
  printWindow.document.close();
}
