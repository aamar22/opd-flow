const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const display = (value) => value === undefined || value === null || value === "" ? "\u2014" : value;
const date = (value) => {
  if (!value) return "\u2014";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? match[3] + "-" + match[2] + "-" + match[1] : "\u2014";
};
const field = (label, value) => '<div class="field"><dt>' + escape(label) + '</dt><dd>' + escape(display(value)) + '</dd></div>';

export function appointmentPrintHtml({ appointment, patient, clinicSettings = {}, printedAt = new Date() }) {
  const uhid = patient?.patientId || appointment.patientId;
  const age = patient?.age === undefined || patient?.age === null ? "\u2014" : patient.age + " years";
  const name = patient?.name || appointment.patientName;
  const contact = [clinicSettings.phone, clinicSettings.email].filter(Boolean).map(escape).join(" | ");
  const logo = /^(https?:\/\/|data:image\/(png|jpeg|webp);base64,|\/(?!\/))/.test(clinicSettings.logoUrl || "") ? '<img class="logo" src="' + escape(clinicSettings.logoUrl) + '" alt="Clinic logo" />' : '';
  const lines = Array.from({ length: 12 }, () => '<tr><td></td><td></td><td></td></tr>').join('');
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Outpatient Sheet - ${escape(uhid)}</title><style>
  @page{size:A4 portrait;margin:12mm}
  *{box-sizing:border-box}body{margin:0;background:#eceff2;color:#171717;font:10pt Arial,Helvetica,sans-serif}
  .sheet{width:186mm;min-height:270mm;margin:8mm auto;background:#fff;padding:0}
  .clinic{text-align:center;position:relative;padding:7mm 18mm 5mm;min-height:32mm}
  .logo{position:absolute;left:0;top:6mm;width:17mm;height:17mm;object-fit:contain}
  .clinic h1{font-size:14pt;line-height:1.3;text-transform:uppercase;margin:0 0 2mm;overflow-wrap:anywhere}
  .clinic p{font-size:8pt;line-height:1.5;margin:1mm 0;white-space:pre-wrap}
  .clinic h2{font-size:10pt;letter-spacing:1px;margin:4mm 0 0}
  .identity{display:flex;align-items:center;justify-content:space-between;gap:6mm;border-bottom:1px solid #333;padding:5mm 2mm 3mm}
  .patient-name{flex:1;overflow-wrap:anywhere}.label{font-size:8pt;color:#444;margin-right:4mm}.patient-name strong{font-size:11pt}
  .uhid{text-align:right;font-size:9pt;flex-shrink:0}.uhid span{display:block;font-size:7pt;letter-spacing:1px;margin-bottom:1mm}
  .details{display:grid;grid-template-columns:1fr 1fr;gap:9mm;padding:4mm 2mm 3mm}
  dl{margin:0}.field{display:grid;grid-template-columns:29mm minmax(0,1fr);gap:2mm;margin:0 0 3mm;line-height:1.4;break-inside:avoid}
  dt{font-size:8pt;color:#444}dd{margin:0;font-size:9pt;white-space:pre-wrap;overflow-wrap:anywhere}
  .allergy{display:flex;gap:4mm;border-bottom:1px solid #333;padding:1mm 2mm 4mm;font-size:9pt}
  .allergy b{font-size:8pt}.blank{flex:1;border-bottom:1px dotted #aaa;min-height:4mm}
  .consultant{border-bottom:1px solid #333;padding:4mm 2mm 1mm;display:grid;grid-template-columns:1fr 1fr;gap:0 9mm}
  .reason{padding:3mm 2mm 4mm;border-bottom:1px solid #333;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;font-size:9pt}
  .notes-title{font-size:9pt;font-weight:normal;margin:5mm 2mm 2mm}
  table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8pt}th{text-align:left;font-weight:600;border-top:1px solid #333;border-bottom:1px solid #333;padding:2mm}
  td{height:8mm;border-bottom:1px solid #aaa}th:first-child{width:25mm}th:nth-child(2){width:47mm}tr{break-inside:avoid}
  footer{display:flex;justify-content:space-between;gap:5mm;padding:3mm 2mm;font-size:7pt;color:#555;line-height:1.5}
  .toolbar{max-width:186mm;margin:16px auto;display:flex;justify-content:space-between;align-items:center;font-size:12px}.toolbar button{padding:9px 16px;cursor:pointer}
  @media print{body{background:white}.sheet{margin:0;width:100%;min-height:0}.toolbar{display:none}.clinic,.identity,.details,.consultant,footer{break-inside:avoid}}
  </style></head><body><div class="toolbar"><span>A4 outpatient sheet</span><button onclick="window.print()">Print / Save as PDF</button></div><main class="sheet">
  <header class="clinic">${logo}<h1>${escape(clinicSettings.clinicName || "Clinavio")}</h1><p>${escape(clinicSettings.address || "")}</p><p>${contact}</p><h2>OUTPATIENT DATA SHEET</h2></header>
  <section class="identity"><div class="patient-name"><span class="label">Patient name</span><strong>${escape(name)}</strong></div><div class="uhid"><span>UHID / REGISTRATION NO.</span><strong>${escape(uhid)}</strong></div></section>
  <section class="details"><dl>${field("Registration no.", uhid)}${field("Age / DOB", age + " / " + date(patient?.dateOfBirth))}${field("Address", patient?.address)}${field("Patient mobile", patient?.phone)}${field("Department", appointment.department)}</dl><dl>${field("Appointment", date(appointment.appointmentDate) + "  " + (appointment.appointmentTime || ""))}${field("Gender", patient?.gender)}${field("Registered on", date(patient?.createdAt))}${field("Visit type", appointment.appointmentType)}${field("Booking status", appointment.status)}</dl></section>
  <div class="allergy"><b>ALLERGIES</b><span class="blank"></span></div>
  <section class="consultant"><dl>${field("Primary consultant", appointment.doctor)}</dl><dl>${field("Referring doctor", "")}</dl></section>
  <div class="reason"><span class="label">Reason for visit</span>${escape(appointment.reason || "\u2014")}</div>
  <h3 class="notes-title">Consultation details</h3><table><thead><tr><th>Date</th><th>Consultant name</th><th>Clinical notes / remarks</th></tr></thead><tbody>${lines}</tbody></table>
  <footer><span>Printed: ${escape(printedAt.toLocaleString("en-IN"))}</span><span>Please bring this sheet to your consultation.<br>Powered by Clinavio</span></footer>
  </main></body></html>`;
}
