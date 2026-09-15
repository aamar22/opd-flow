import { jsPDF } from "jspdf";
export const money = value => "INR " + Number(value || 0).toFixed(2);
export const billDate = value => value ? new Date(value).toLocaleString("en-IN") : "-";

export function buildBillingPdf({ title, reference, clinicSettings = {}, patientName, patientId, details = [], items = [], totals = [], payments = [], note = "", quantityLabel = "QTY" }) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const left = 12, right = 198, width = 186;
  let y = 16;
  const text = (value, x, yy, size = 9, bold = false, align = "left") => {
    doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size);
    doc.text(String(value ?? "-"), x, yy, { align });
  };
  const rule = (yy) => { doc.setDrawColor(110); doc.setLineWidth(0.2); doc.line(left, yy, right, yy); };
  const continuation = () => {
    doc.addPage(); y = 16;
    text(clinicSettings.clinicName || "Clinavio", left, y, 10, true);
    text(reference, right, y, 8, false, "right");
    rule(y + 3); y += 11;
  };
  const ensure = height => { if (y + height > 275) continuation(); };
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  for (const line of doc.splitTextToSize((clinicSettings.clinicName || "Clinavio").toUpperCase(), width)) {
    text(line, 105, y, 14, true, "center"); y += 6;
  }
  for (const value of [clinicSettings.address, [clinicSettings.phone, clinicSettings.email].filter(Boolean).join(" | ")].filter(Boolean)) {
    doc.setFontSize(8);
    for (const line of doc.splitTextToSize(value, width)) { text(line, 105, y, 8, false, "center"); y += 4; }
  }
  y += 3; text(title, 105, y, 10, true, "center"); y += 10;
  text("PATIENT NAME", left, y, 7); text("UHID / PATIENT ID", right, y, 7, false, "right"); y += 5;
  doc.setFontSize(11);
  const names = doc.splitTextToSize(String(patientName || "-"), 110);
  for (const [i,line] of names.entries()) text(line, left, y+i*5, 11, true);
  text(patientId, right, y, 9, true, "right"); y += Math.max(5, names.length*5); rule(y); y += 7;
  for (let i=0;i<details.length;i+=2) {
    const pair=details.slice(i,i+2);
    doc.setFontSize(9);
    const wrapped=pair.map(([,value])=>doc.splitTextToSize(String(value ?? "-"),57));
    const height=Math.max(...wrapped.map(lines=>lines.length))*4+3;
    ensure(height);
    pair.forEach(([label],j)=>{
      const x=left+j*96; text(label,x,y,8);
      wrapped[j].forEach((line,k)=>text(line,x+34,y+k*4));
    });
    y+=height;
  }
  rule(y); y+=8;
  const tableHead=()=>{ rule(y-4); text("#",left+1,y,8,true);text("SERVICE / CHARGE",left+9,y,8,true);text(quantityLabel,143,y,8,true,"right");text("RATE",168,y,8,true,"right");text("AMOUNT",right-1,y,8,true,"right");rule(y+3);y+=9; };
  tableHead();
  items.forEach((item,index)=>{
    doc.setFontSize(9);
    const lines=doc.splitTextToSize(String(item.name || "-"),105);
    // Split long descriptions across pages while keeping the amounts on the first line.
    lines.forEach((line,lineIndex)=>{
      if(y+6>275){continuation();tableHead();}
      text(line,left+9,y);
      if(lineIndex===0){text(index+1,left+1,y,8);text(item.quantity ?? "-",143,y,8,false,"right");text(money(item.rate),168,y,8,false,"right");text(money(item.amount ?? Number(item.rate)*Number(item.quantity)),right-1,y,8,false,"right");}
      y+=4.5;
    });
    rule(y+1);y+=6;
  });
  if(!items.length){text("No charges recorded",left+9,y);y+=9;}
  y+=3;ensure(totals.length*7+8);
  for(const [label,value,emphasis] of totals){
    if(emphasis)rule(y-4);
    text(label,113,y,9,!!emphasis);text(money(value),right-1,y,10,!!emphasis,"right");y+=7;
  }
  if(payments.length){
    ensure(18);y+=3;text("ADVANCE PAYMENT HISTORY",left,y,9,true);y+=7;
    for(const payment of payments){
      const value=billDate(payment.paidAt)+" | "+(payment.paymentMode || "-")+" | "+money(payment.amount)+(payment.reference ? " | Ref: "+payment.reference : "");
      doc.setFontSize(8);
      for(const line of doc.splitTextToSize(value,width)){ensure(5);text(line,left,y,8);y+=5;}
    }
  }
  if(note){doc.setFontSize(8);for(const line of doc.splitTextToSize(note,width)){ensure(6);y+=5;text(line,left,y,8);}}
  ensure(24);y+=17;text("Patient / attendant signature",left,y,8);text("Authorized signatory",right,y,8,false,"right");
  const pages=doc.getNumberOfPages();
  for(let page=1;page<=pages;page++){doc.setPage(page);rule(281);text("Powered by Clinavio",left,287,7);text("Page "+page+" of "+pages,right,287,7,false,"right");}
  return doc;
}

export async function saveBillingPdf(doc, prefix, reference) {
  const filename=String(reference || "bill").replace(/[^a-zA-Z0-9_-]/g,"_");
  await doc.save(prefix+"-"+filename+".pdf",{returnPromise:true});
}
