import { useEffect, useMemo, useState } from "react";
import { invoiceApi, medicineApi, patientApi } from "../../services/api";

const blank = {
  patient: null,
  search: "",
  items: [],
  discount: "",
  paymentMode: "Cash",
};

export default function PharmacyBillingPage({ medicines, onComplete }) {
  const [form, setForm] = useState(blank);
  const [patients, setPatients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState("");
  const availableMedicines = useMemo(() => {
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const grouped = new Map();
    medicines
      .filter(
        (item) =>
          Number(item.stock) > 0 &&
          (!item.expiryDate || new Date(item.expiryDate) >= today),
      )
      .sort(
        (a, b) =>
          new Date(a.expiryDate || "9999-12-31") -
          new Date(b.expiryDate || "9999-12-31"),
      )
      .forEach((item) => {
        const key = item.name.toLowerCase();
        const current = grouped.get(key);
        grouped.set(key, {
          name: item.name,
          rate: current?.rate ?? Number(item.price),
          stock: (current?.stock || 0) + Number(item.stock),
          unit: item.unit,
        });
      });
    return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [medicines]);
  const loadInvoices = () =>
    invoiceApi
      .getPage({ page: 1, limit: 10, invoiceType: "Pharmacy" })
      .then(({ data }) => setInvoices(data.items));
  useEffect(() => {
    loadInvoices();
  }, []);
  useEffect(() => {
    if (!form.search.trim() || form.patient) return setPatients([]);
    const timer = window.setTimeout(
      () =>
        patientApi
          .getPage({ page: 1, limit: 6, search: form.search })
          .then(({ data }) => setPatients(data.items)),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [form.search, form.patient]);
  const subtotal = form.items.reduce(
    (sum, item) => sum + item.rate * item.quantity,
    0,
  );
  const total = Math.max(0, subtotal - (Number(form.discount) || 0));
  const addMedicine = (name) => {
    const medicine = availableMedicines.find((item) => item.name === name);
    if (!medicine) return;
    const existing = form.items.find((item) => item.name === name);
    if (existing && existing.quantity >= medicine.stock) return;
    setForm({
      ...form,
      items: existing
        ? form.items.map((item) =>
            item.name === name
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [
            ...form.items,
            {
              code: "MED",
              name,
              rate: medicine.rate,
              quantity: 1,
              stock: medicine.stock,
              unit: medicine.unit,
            },
          ],
    });
  };
  const updateQuantity = (name, quantity) =>
    setForm({
      ...form,
      items: form.items.map((item) =>
        item.name === name
          ? {
              ...item,
              quantity: Math.min(
                item.stock,
                Math.max(1, Number(quantity) || 1),
              ),
            }
          : item,
      ),
    });
  const save = async () => {
    if (!form.patient || !form.items.length) return;
    setError("");
    try {
      await medicineApi.dispense(
        form.items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
        })),
      );
      await invoiceApi.create({
        patientId: form.patient._id,
        patientName: form.patient.name,
        invoiceType: "Pharmacy",
        items: form.items.map(({ stock, unit, ...item }) => item),
        discount: Number(form.discount) || 0,
        paymentMode: form.paymentMode,
      });
      setForm(blank);
      loadInvoices();
      onComplete("Pharmacy bill created and batch stock updated.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to complete the pharmacy sale.",
      );
    }
  };
  return (
    <section className="billingWorkspace">
      <div className="appointmentHeader">
        <div>
          <h2>Pharmacy Billing</h2>
          <p>Create medicine bills and update batch stock automatically</p>
        </div>
      </div>
      {error && <div className="notice">{error}</div>}
      <div className="billingGrid">
        <section className="masterCard">
          <h3>New medicine bill</h3>
          <label>
            Search patient
            <input
              value={form.search}
              placeholder="Name, UHID, phone"
              onChange={(event) =>
                setForm({ ...form, search: event.target.value, patient: null })
              }
            />
          </label>
          {!!patients.length && (
            <div className="patientResults">
              {patients.map((patient) => (
                <button
                  type="button"
                  key={patient._id}
                  onClick={() =>
                    setForm({
                      ...form,
                      patient,
                      search: `${patient.name} · ${patient.patientId}`,
                    })
                  }
                >
                  <b>{patient.name}</b>
                  <span>
                    {patient.patientId} · {patient.phone}
                  </span>
                </button>
              ))}
            </div>
          )}
          {form.patient && (
            <p className="billingPatient">
              <b>{form.patient.name}</b> · {form.patient.patientId} ·{" "}
              {form.patient.phone}
            </p>
          )}
          <label>
            Add medicine
            <select
              value=""
              onChange={(event) => addMedicine(event.target.value)}
            >
              <option value="">Select available medicine</option>
              {availableMedicines.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name} — ₹{item.rate} ({item.stock} {item.unit})
                </option>
              ))}
            </select>
          </label>
          <table>
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Rate</th>
                <th>Qty</th>
                <th>Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {form.items.map((item) => (
                <tr key={item.name}>
                  <td>
                    {item.name}
                    <small>
                      {item.stock} {item.unit} available
                    </small>
                  </td>
                  <td>₹{item.rate}</td>
                  <td>
                    <input
                      className="quantityInput"
                      type="number"
                      min="1"
                      max={item.stock}
                      value={item.quantity}
                      onChange={(event) =>
                        updateQuantity(item.name, event.target.value)
                      }
                    />
                  </td>
                  <td>₹{(item.rate * item.quantity).toFixed(2)}</td>
                  <td>
                    <button
                      className="textButton"
                      onClick={() =>
                        setForm({
                          ...form,
                          items: form.items.filter(
                            (entry) => entry.name !== item.name,
                          ),
                        })
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="billingTotals">
            <label>
              Discount
              <input
                type="number"
                min="0"
                value={form.discount}
                onChange={(event) =>
                  setForm({ ...form, discount: event.target.value })
                }
              />
            </label>
            <label>
              Payment mode
              <select
                value={form.paymentMode}
                onChange={(event) =>
                  setForm({ ...form, paymentMode: event.target.value })
                }
              >
                <option>Cash</option>
                <option>Card</option>
                <option>UPI</option>
              </select>
            </label>
            <p>
              Subtotal <b>₹{subtotal.toFixed(2)}</b>
              <br />
              Total <strong>₹{total.toFixed(2)}</strong>
            </p>
          </div>
          <button
            className="appointmentPrimary"
            disabled={!form.patient || !form.items.length}
            onClick={save}
          >
            Create pharmacy bill
          </button>
        </section>
        <section className="masterCard">
          <h3>Recent pharmacy bills</h3>
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Patient</th>
                <th>Total</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice._id}>
                  <td>{invoice.invoiceNumber}</td>
                  <td>
                    {invoice.patientName}
                    <small>{invoice.patientId}</small>
                  </td>
                  <td>₹{invoice.total}</td>
                  <td>{invoice.paymentMode}</td>
                </tr>
              ))}
              {!invoices.length && (
                <tr>
                  <td className="empty" colSpan="4">
                    No pharmacy bills created.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </section>
  );
}
