import { buildBillingPdf, billDate, saveBillingPdf } from "./billingPdf.mjs";
export function buildIpdBill({ admission, preview, discount = 0, paymentMode = "Cash", clinicSettings = {} }) {
  const invoice=preview.invoice;
  const subtotal=invoice?.subtotal ?? preview.subtotal;
  const appliedDiscount=invoice?.discount ?? Math.max(0,Number(discount)||0);
  const advances=invoice?.advancePaid ?? preview.advanceTotal ?? 0;
  const net=Math.max(0,subtotal-appliedDiscount);
  const totals=[["Subtotal",subtotal],["Discount",appliedDiscount],["After discount",net],["Advance paid",advances],[invoice ? "Final bill amount" : "Balance due",invoice?.total ?? Math.max(0,net-advances),true]];
  if(advances>net)totals.push(["Credit / refund due",advances-net,true]);
  return buildBillingPdf({
    title:invoice ? "FINAL IPD BILL" : "IPD BILL ESTIMATE", reference:invoice?.invoiceNumber || admission.admissionNumber,
    clinicSettings,patientName:admission.patientName,patientId:admission.patientCode || admission.patientId,
    details:[["Invoice",invoice?.invoiceNumber || "Not finalized"],["Admission",admission.admissionNumber],["Consultant",admission.doctor],["Ward / bed",(admission.wardName || "-")+" / "+(admission.bedNumber || "-")],["Admitted",billDate(admission.admittedAt)],["Discharged",admission.dischargedAt ? billDate(admission.dischargedAt) : "Ongoing"],["Payment mode",invoice?.paymentMode || paymentMode],["Bill status",invoice?.status || "Estimate"],["Generated",billDate(new Date())]],
    quantityLabel:"QTY / HRS", items:invoice?.items || preview.items || [], totals,payments:preview.advances || [],
    note:invoice ? "Please retain this bill for your records." : "Estimate only. Charges may change until the final bill is created.",
  });
}
export async function downloadIpdBill(options){
  await saveBillingPdf(buildIpdBill(options),options.preview.invoice ? "IPD-Bill" : "IPD-Estimate",options.preview.invoice?.invoiceNumber || options.admission.admissionNumber);
}
