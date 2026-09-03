import { useEffect, useState } from "react";
import { serviceApi } from "../../services/api";
const empty = { code: "", name: "", category: "Consultation", rate: "" };
export default function ServiceMastersPage({ onComplete }) {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const { data } = await serviceApi.getAll();
      setServices(Array.isArray(data) ? data : []);
      setError("");
    } catch {
      setServices([]);
      setError(
        "Service Masters API is unavailable. Restart the API server and try again.",
      );
    }
  };
  useEffect(() => {
    load();
  }, []);
  const add = async (event) => {
    event.preventDefault();
    try {
      await serviceApi.create({
        ...form,
        rate: Number(form.rate),
        active: true,
      });
      setForm(empty);
      load();
      onComplete("Billing service added.");
    } catch {
      setError(
        "Could not save the service. Check the service code and API connection.",
      );
    }
  };
  const toggle = async (service) => {
    try {
      await serviceApi.update(service._id, { active: !service.active });
      load();
    } catch {
      setError("Could not update the service.");
    }
  };
  return (
    <section className="mastersWorkspace">
      <div className="appointmentHeader">
        <div>
          <h2>Service Masters</h2>
          <p>Configure billable clinical services and their rates</p>
        </div>
      </div>
      <section className="masterCard">
        <h3>Add service</h3>
        {error && <div className="notice">{error}</div>}
        <form onSubmit={add}>
          <div className="masterGrid">
            <label>
              Service code
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
              />
            </label>
            <label>
              Service name
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              Category
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              />
            </label>
            <label>
              Rate
              <input
                type="number"
                min="0"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
                required
              />
            </label>
          </div>
          <button className="primary">Add service</button>
        </form>
      </section>
      <section className="masterCard">
        <h3>Configured services</h3>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Service</th>
              <th>Category</th>
              <th>Rate</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service._id}>
                <td>{service.code}</td>
                <td>{service.name}</td>
                <td>{service.category}</td>
                <td>₹{service.rate}</td>
                <td>
                  <span
                    className={`badge ${service.active ? "success" : "danger"}`}
                  >
                    {service.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td>
                  <button
                    className="textButton"
                    onClick={() => toggle(service)}
                  >
                    {service.active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
            {!services.length && (
              <tr>
                <td className="empty" colSpan="6">
                  No services configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </section>
  );
}
