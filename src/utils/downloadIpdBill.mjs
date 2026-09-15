import { jsPDF } from "jspdf";

export function buildIpdBill({
  admission,
  preview,
  discount = 0,
  paymentMode = "Cash",
  clinicSettings = {},
}) {
  const invoice = preview.invoice;
  const doc = new jsPDF();
  let y = 20;
  const money = (value) => `INR ${Number(value || 0).toFixed(2)}`;
  const line = (value, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    for (const text of doc.splitTextToSize(String(value ?? ""), 178)) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(text, 16, y);
      y += 6;
    }
  };
  doc.setFontSize(15);
  line(clinicSettings.clinicName || "Clinavio", true);
  doc.setFontSize(10);
  if (clinicSettings.address) line(clinicSettings.address);
  if (clinicSettings.phone) line(`Phone: ${clinicSettings.phone}`);
  line(invoice ? "FINAL IPD BILL" : "IPD BILL ESTIMATE", true);
  if (invoice)
    line(`Invoice: ${invoice.invoiceNumber} | Status: ${invoice.status}`);
  line(`Admission: ${admission.admissionNumber}`);
  line(
    `Patient: ${admission.patientName} | ID: ${admission.patientCode || admission.patientId}`,
  );
  line(`Doctor: ${admission.doctor}`);
  line(`Ward: ${admission.wardName} | Bed: ${admission.bedNumber}`);
  const date = (value) =>
    value ? new Date(value).toLocaleString() : "Ongoing";
  line(`Admitted: ${date(admission.admittedAt)}`);
  line(`Discharged: ${date(admission.dischargedAt)}`);
  line(`Generated: ${new Date().toLocaleString()}`);
  y += 4;
  line("CHARGES", true);
  for (const [index, item] of (invoice?.items || preview.items).entries()) {
    line(`${index + 1}. ${item.name}`, true);
    line(
      `Rate: ${money(item.rate)} | Hours/Qty: ${item.quantity} | Amount: ${money(item.amount)}`,
    );
  }
  y += 4;
  const subtotal = invoice?.subtotal ?? preview.subtotal;
  const appliedDiscount = invoice?.discount ?? Math.max(0, discount);
  const advances = invoice?.advancePaid ?? preview.advanceTotal ?? 0;
  const net = Math.max(0, subtotal - appliedDiscount);
  line(`Subtotal: ${money(subtotal)}`);
  line(`Discount: ${money(appliedDiscount)}`);
  line(`After discount: ${money(net)}`);
  line(`Advance paid: ${money(advances)}`);
  line(
    `${invoice ? "Final bill amount" : "Balance due"}: ${money(invoice?.total ?? Math.max(0, net - advances))}`,
    true,
  );
  if (advances > net)
    line(`Credit / refund due: ${money(advances - net)}`, true);
  line(`Payment mode: ${invoice?.paymentMode || paymentMode}`);
  if (preview.advances?.length) {
    y += 4;
    line("ADVANCE PAYMENT HISTORY", true);
    for (const payment of preview.advances) {
      line(
        `${date(payment.paidAt)} | ${payment.paymentMode} | ${money(payment.amount)}`,
      );
      if (payment.reference) line(`Reference: ${payment.reference}`);
    }
  }
  if (!invoice)
    line("Estimate only. Charges may change until the final bill is created.");
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(9);
    doc.text(`Page ${page} of ${pages}`, 194, 288, { align: "right" });
  }
  return doc;
}

export async function downloadIpdBill(options) {
  const doc = buildIpdBill(options);
  const number = String(
    options.preview.invoice?.invoiceNumber || options.admission.admissionNumber,
  ).replace(/[^a-zA-Z0-9_-]/g, "_");
  await doc.save(
    `${options.preview.invoice ? "IPD-Bill" : "IPD-Estimate"}-${number}.pdf`,
    { returnPromise: true },
  );
}
