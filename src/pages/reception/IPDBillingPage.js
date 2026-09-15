import { useEffect, useRef, useState } from "react";
import { ipdApi } from "../../services/api";

const emptyCharge = {
  doctor: "",
  description: "Doctor consultation",
  amount: "",
};
const emptyAdvance = { amount: "", paymentMode: "Cash", reference: "" };
export default function IPDBillingPage({ onComplete, clinicSettings }) {
  const selection = useRef(0);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [admissions, setAdmissions] = useState([]);
  const [active, setActive] = useState(null);
  const [preview, setPreview] = useState(null);
  const [charge, setCharge] = useState(emptyCharge);
  const [advance, setAdvance] = useState(emptyAdvance);
  const [discount, setDiscount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const load = () =>
    ipdApi.getAdmissions().then(({ data }) => setAdmissions(data));
  useEffect(() => {
    load();
  }, []);
  const selectAdmission = async (admission) => {
    const request = ++selection.current;
    setPreview(null);
    setError("");
    setActive(admission);
    setDiscount("");
    setCharge({ ...emptyCharge, doctor: admission.doctor });
    setAdvance(emptyAdvance);
    try {
      const { data } = await ipdApi.getBillPreview(admission._id);
      if (request !== selection.current) return;
      setPreview(data);
      setDiscount(data.invoice?.discount ?? "");
      setPaymentMode(data.invoice?.paymentMode || "Cash");
    } catch {
      if (request === selection.current)
        setError("Could not load the bill. Select the patient to retry.");
    }
  };
  const addConsultation = async (event) => {
    event.preventDefault();
    const { data } = await ipdApi.addDoctorCharge(active._id, charge);
    setActive(data);
    setCharge({ ...emptyCharge, doctor: data.doctor });
    setPreview((await ipdApi.getBillPreview(active._id)).data);
    load();
    onComplete("Doctor consultation charge added.");
  };
  const addAdvance = async (event) => {
    event.preventDefault();
    const { data } = await ipdApi.addAdvance(active._id, advance);
    setActive(data);
    setAdvance(emptyAdvance);
    setPreview((await ipdApi.getBillPreview(active._id)).data);
    load();
    onComplete("IPD advance payment recorded.");
  };
  const createBill = async () => {
    const { data: invoice } = await ipdApi.createBill(active._id, {
      discount: Number(discount) || 0,
      paymentMode,
    });
    setActive({
      ...active,
      billedAt: invoice.createdAt || new Date().toISOString(),
      invoiceId: invoice._id,
    });
    setPreview({
      ...preview,
      items: invoice.items,
      subtotal: invoice.subtotal,
      advanceTotal: invoice.advancePaid || 0,
      invoice,
    });
    load();
    onComplete("Final IPD bill created successfully.");
  };
  const downloadPdf = async () => {
    setExporting(true);
    setError("");
    try {
      const { downloadIpdBill } =
        await import("../../utils/downloadIpdBill.mjs");
      await downloadIpdBill({
        admission: active,
        preview,
        discount: Number(discount) || 0,
        paymentMode,
        clinicSettings,
      });
    } catch {
      setError("Could not download the PDF. Please try again.");
    } finally {
      setExporting(false);
    }
  };
  const beforeAdvance = Math.max(
    0,
    (preview?.subtotal || 0) - (Number(discount) || 0),
  );
  const total = Math.max(0, beforeAdvance - (preview?.advanceTotal || 0));
  const credit = Math.max(0, (preview?.advanceTotal || 0) - beforeAdvance);
  return (
    <section className="billingWorkspace">
      <div className="appointmentHeader">
        <div>
          <h2>Advanced IPD Billing</h2>
          <p>
            Hourly bed charges across ward transfers plus doctor consultation
            fees
          </p>
        </div>
      </div>
      <div className="billingGrid">
        <section className="masterCard">
          <h3>IPD patients</h3>
          {admissions.map((item) => (
            <button
              type="button"
              className={`ipdBillPatient ${active?._id === item._id ? "active" : ""}`}
              key={item._id}
              onClick={() => selectAdmission(item)}
            >
              <div>
                <b>{item.patientName}</b>
                <small>
                  {item.admissionNumber} · {item.patientCode}
                </small>
                <span>
                  {item.wardName} · Bed {item.bedNumber}
                </span>
              </div>
              <span
                className={`badge ${item.billedAt ? "success" : item.status === "Discharged" ? "complete" : "waiting"}`}
              >
                {item.billedAt ? "Billed" : item.status}
              </span>
            </button>
          ))}
          {!admissions.length && (
            <p className="empty">No IPD admissions found.</p>
          )}
        </section>
        <section className="masterCard ipdBillDetail">
          {error && <p role="alert">{error}</p>}
          {active && preview ? (
            <>
              <h3>{active.patientName}</h3>
              <button
                type="button"
                className="outlineButton"
                disabled={exporting}
                onClick={downloadPdf}
              >
                {exporting
                  ? "Preparing PDF..."
                  : preview.invoice
                    ? "Download bill PDF"
                    : "Download estimate PDF"}
              </button>
              <span className="masterHint">
                {active.admissionNumber} · {active.status}
              </span>
              {!active.billedAt && (
                <form className="doctorChargeForm" onSubmit={addConsultation}>
                  <h4>Add doctor consultation</h4>
                  <div className="grid2">
                    <label>
                      Doctor
                      <input
                        required
                        value={charge.doctor}
                        onChange={(e) =>
                          setCharge({ ...charge, doctor: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Fee (₹)
                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={charge.amount}
                        onChange={(e) =>
                          setCharge({ ...charge, amount: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Description
                    <input
                      required
                      value={charge.description}
                      onChange={(e) =>
                        setCharge({ ...charge, description: e.target.value })
                      }
                    />
                  </label>
                  <button className="primary">Add consultation fee</button>
                </form>
              )}
              {!active.billedAt && (
                <form className="advancePaymentForm" onSubmit={addAdvance}>
                  <h4>Record advance payment</h4>
                  <div className="grid2">
                    <label>
                      Advance amount (₹)
                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={advance.amount}
                        onChange={(e) =>
                          setAdvance({ ...advance, amount: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Payment mode
                      <select
                        value={advance.paymentMode}
                        onChange={(e) =>
                          setAdvance({
                            ...advance,
                            paymentMode: e.target.value,
                          })
                        }
                      >
                        <option>Cash</option>
                        <option>Card</option>
                        <option>UPI</option>
                        <option>Bank Transfer</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Reference / receipt number
                    <input
                      value={advance.reference}
                      placeholder="Optional"
                      onChange={(e) =>
                        setAdvance({ ...advance, reference: e.target.value })
                      }
                    />
                  </label>
                  <button className="primary">Add advance</button>
                </form>
              )}
              {!!preview.advances?.length && (
                <div className="advanceLedger">
                  <h4>Advance payment history</h4>
                  {preview.advances.map((payment, index) => (
                    <div key={payment._id || index}>
                      <span>
                        {new Date(payment.paidAt).toLocaleString()} ·{" "}
                        {payment.paymentMode}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </span>
                      <b>₹{Number(payment.amount).toFixed(2)}</b>
                    </div>
                  ))}
                </div>
              )}
              {preview.billingRules && (
                <p className="appliedBillingRule">
                  <b>Applied bed rule:</b>{" "}
                  {preview.billingRules?.calculationMethod === "HighestPerDay"
                    ? "Highest category per day"
                    : preview.billingRules?.calculationMethod === "MinimumGrace"
                      ? `Minimum ${preview.billingRules.minimumHours} hour(s) after ${preview.billingRules.graceMinutes} minute grace`
                      : "Prorated by exact time"}
                </p>
              )}
              <table>
                <thead>
                  <tr>
                    <th>Charge</th>
                    <th>Rate</th>
                    <th>Hours/Qty</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map((item, index) => (
                    <tr key={`${item.code}-${index}`}>
                      <td>
                        {item.name}
                        <small>
                          {item.category === "Bed"
                            ? "Hourly bed usage"
                            : "Consultation"}
                        </small>
                      </td>
                      <td>₹{item.rate.toFixed(2)}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="billingTotals">
                <label>
                  Amount to be Discount
                  <input
                    type="number"
                    min="0"
                    value={discount}
                    disabled={!!active.billedAt}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </label>
                <label>
                  Payment mode
                  <select
                    value={paymentMode}
                    disabled={!!active.billedAt}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  >
                    <option>Cash</option>
                    <option>Card</option>
                    <option>UPI</option>
                  </select>
                </label>
                <p>
                  Subtotal <b>₹{preview.subtotal.toFixed(2)}</b>
                  <br />
                  After discount <b>₹{beforeAdvance.toFixed(2)}</b>
                  <br />
                  Advance paid <b>−₹{preview.advanceTotal.toFixed(2)}</b>
                  <br />
                  Balance due <strong>₹{total.toFixed(2)}</strong>
                  {credit > 0 && (
                    <>
                      <br />
                      Credit / refund due <b>₹{credit.toFixed(2)}</b>
                    </>
                  )}
                </p>
              </div>
              {active.status === "Admitted" && (
                <p className="ipdBillingNote">
                  Live estimate. Discharge the patient to close the final
                  bed-stay hours and create the bill.
                </p>
              )}
              <button
                className="appointmentPrimary"
                disabled={active.status !== "Discharged" || !!active.billedAt}
                onClick={createBill}
              >
                {active.billedAt ? "Already billed" : "Create final IPD bill"}
              </button>
            </>
          ) : (
            <p className="empty">Select an IPD admission to review charges.</p>
          )}
        </section>
      </div>
    </section>
  );
}
