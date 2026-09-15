import { buildBillingPdf, billDate, saveBillingPdf } from "./billingPdf.mjs";
export function buildPatientBill({ invoice, patient, clinicSettings = {} }) {
  return buildBillingPdf({ title:"PATIENT BILL",reference:invoice.invoiceNumber,clinicSettings,
    patientName:invoice.patientName,patientId:patient?.patientId || invoice.patientId,
    details:[["Invoice",invoice.invoiceNumber],["Bill date",billDate(invoice.createdAt)],["Age / gender",(patient?.age ?? "-")+" / "+(patient?.gender || "-")],["Mobile",patient?.phone || "-"],["Address",patient?.address || "-"],["Payment mode",invoice.paymentMode],["Bill status",invoice.status || "-"]],
    items:invoice.items || [],totals:[["Subtotal",invoice.subtotal],["Discount",invoice.discount],["Total bill amount",invoice.total,true]],
    note:"Please retain this bill for your records.",
  });
}
export async function downloadPatientBill(options){await saveBillingPdf(buildPatientBill(options),"Patient-Bill",options.invoice.invoiceNumber);}
