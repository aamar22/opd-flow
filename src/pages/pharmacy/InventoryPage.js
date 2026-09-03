import { useState } from "react";
import { medicineApi } from "../../services/api";
import { Field, FormCard } from "../../components/common/FormFields";

const initialForm = {
  name: "",
  vendorName: "",
  batchNumber: "",
  orderDate: new Date().toISOString().slice(0, 10),
  expiryDate: "",
  stock: "",
  unit: "Tablets",
  price: "",
  reorder: "20",
};
const isExpired = (item) =>
  item.expiryDate &&
  new Date(item.expiryDate) < new Date(new Date().setHours(0, 0, 0, 0));

export default function InventoryPage({ medicines, onComplete }) {
  const [form, setForm] = useState(initialForm);
  const set = (name) => (value) => setForm({ ...form, [name]: value });
  const submit = async (event) => {
    event.preventDefault();
    await medicineApi.create(form);
    setForm(initialForm);
    onComplete("Vendor batch added to inventory.");
  };
  return (
    <>
      <FormCard
        title="Receive vendor order"
        subtitle="Store every medicine purchase by vendor, batch, and expiry"
        onSubmit={submit}
        compact
      >
        <div className="grid3">
          <Field
            label="Medicine name"
            value={form.name}
            onChange={set("name")}
            required
          />
          <Field
            label="Vendor name"
            value={form.vendorName}
            onChange={set("vendorName")}
            required
          />
          <Field
            label="Batch number"
            value={form.batchNumber}
            onChange={set("batchNumber")}
            required
          />
        </div>
        <div className="grid3">
          <Field
            label="Order date"
            type="date"
            value={form.orderDate}
            onChange={set("orderDate")}
            required
          />
          <Field
            label="Expiry date"
            type="date"
            value={form.expiryDate}
            onChange={set("expiryDate")}
            required
          />
          <Field
            label="Received quantity"
            type="number"
            value={form.stock}
            onChange={set("stock")}
            required
          />
        </div>
        <div className="grid3">
          <Field
            label="Unit price (₹)"
            type="number"
            value={form.price}
            onChange={set("price")}
            required
          />
          <Field
            label="Reorder level"
            type="number"
            value={form.reorder}
            onChange={set("reorder")}
            required
          />
          <Field
            label="Unit"
            value={form.unit}
            onChange={set("unit")}
            required
          />
        </div>
        <button className="primary">Save vendor batch →</button>
      </FormCard>
      <section className="panel">
        <div className="panelHead">
          <div>
            <h2>Medicine inventory</h2>
            <p>Batch-level stock, vendor, and expiry alerts</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Medicine</th>
              <th>Vendor / batch</th>
              <th>Expiry</th>
              <th>Available stock</th>
              <th>Unit price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {medicines.map((item) => (
              <tr key={item._id}>
                <td>
                  <b>{item.name}</b>
                </td>
                <td>
                  <b>{item.vendorName || "—"}</b>
                  <small>{item.batchNumber || "Legacy stock"}</small>
                </td>
                <td>
                  {item.expiryDate
                    ? new Date(item.expiryDate).toLocaleDateString()
                    : "—"}
                </td>
                <td>
                  {item.stock} {item.unit}
                </td>
                <td>₹{item.price}</td>
                <td>
                  <span
                    className={`badge ${isExpired(item) || item.stock <= item.reorder ? "danger" : "success"}`}
                  >
                    {isExpired(item)
                      ? "Expired"
                      : item.stock <= item.reorder
                        ? "Reorder now"
                        : "In stock"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
