import { useEffect, useMemo, useState } from "react";
import { invoiceApi, patientApi, serviceApi } from "../../services/api";
const blank = {
  patient: null,
  search: "",
  items: [],
  discount: "",
  paymentMode: "Cash",
};
export default function BillingPage({ onComplete }) {
  const [form, setForm] = useState(blank);
  const [services, setServices] = useState([]);
  const [patients, setPatients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const loadInvoices = () =>
    invoiceApi
      .getPage({ page: 1, limit: 8 })
      .then(({ data }) => setInvoices(data.items));
  useEffect(() => {
    serviceApi.getAll({ active: true }).then(({ data }) => setServices(data));
    loadInvoices();
  }, []);
  useEffect(() => {
    if (!form.search.trim()) return setPatients([]);
    const timer = setTimeout(
      () =>
        patientApi
          .getPage({ page: 1, limit: 6, search: form.search })
          .then(({ data }) => setPatients(data.items)),
      250,
    );
    return () => clearTimeout(timer);
  }, [form.search]);
  const subtotal = useMemo(
    () => form.items.reduce((sum, item) => sum + item.rate * item.quantity, 0),
    [form.items],
  );
  const total = Math.max(0, subtotal - (Number(form.discount) || 0));
  const addService = (id) => {
    const service = services.find((item) => item._id === id);
    if (!service) return;
    const existing = form.items.find((item) => item.serviceId === id);
    setForm({
      ...form,
      items: existing
        ? form.items.map((item) =>
            item.serviceId === id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [
            ...form.items,
            {
              serviceId: id,
              code: service.code,
              name: service.name,
              rate: Number(service.rate),
              quantity: 1,
            },
          ],
    });
  };
  const save = async () => {
    if (!form.patient || !form.items.length) return;
    await invoiceApi.create({
      patientId: form.patient._id,
      patientName: form.patient.name,
      items: form.items,
      discount: Number(form.discount) || 0,
      paymentMode: form.paymentMode,
    });
    setForm(blank);
    loadInvoices();
    onComplete("Patient bill created successfully.");
  };
  return (
    <section className="billingWorkspace">
      <div className="appointmentHeader">
        <div>
          <h2>Patient Billing</h2>
          <p>Create bills using the services configured by Admin</p>
        </div>
      </div>
      <div className="billingGrid">
        <section className="masterCard">
          <h3>New bill</h3>
          <label>
            Search patient
            <input
              value={form.search}
              onChange={(e) =>
                setForm({ ...form, search: e.target.value, patient: null })
              }
              placeholder="Name, UHID, phone"
            />
          </label>
          {patients.length > 0 && !form.patient && (
            <div className="patientResults">
              {patients.map((patient) => (
                <button
                  key={patient._id}
                  type="button"
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
              <b>{form.patient.name}</b> · {form.patient.patientId}
            </p>
          )}
          <label>
            Add service
            <select value="" onChange={(e) => addService(e.target.value)}>
              <option value="">Select a service</option>
              {services.map((service) => (
                <option value={service._id} key={service._id}>
                  {service.name} — ₹{service.rate}
                </option>
              ))}
            </select>
          </label>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Rate</th>
                <th>Qty</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {form.items.map((item) => (
                <tr key={item.serviceId}>
                  <td>{item.name}</td>
                  <td>₹{item.rate}</td>
                  <td>
                    <input
                      className="quantityInput"
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          items: form.items.map((entry) =>
                            entry.serviceId === item.serviceId
                              ? {
                                  ...entry,
                                  quantity: Number(e.target.value) || 1,
                                }
                              : entry,
                          ),
                        })
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="textButton"
                      onClick={() =>
                        setForm({
                          ...form,
                          items: form.items.filter(
                            (entry) => entry.serviceId !== item.serviceId,
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
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
              />
            </label>
            <label>
              Payment mode
              <select
                value={form.paymentMode}
                onChange={(e) =>
                  setForm({ ...form, paymentMode: e.target.value })
                }
              >
                <option>Cash</option>
                <option>Card</option>
                <option>UPI</option>
              </select>
            </label>
            <p>
              Subtotal <b>₹{subtotal}</b>
              <br />
              Total <strong>₹{total}</strong>
            </p>
          </div>
          <button
            className="appointmentPrimary"
            onClick={save}
            disabled={!form.patient || !form.items.length}
          >
            Create bill
          </button>
        </section>
        <section className="masterCard">
          <h3>Recent bills</h3>
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
                    No bills created.
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
