const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
// Always isolate HTTP tests from the hosting environment and real database.
process.env.NODE_ENV = "test";
const app = require("../server/app");

test("patient registration through appointment, consultation, and billing", async (t) => {
  // Import app without index.js so this test never connects to a real database.
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (path, method = "GET", body, status = 200) => {
    const response = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const result = await response.json();
    assert.equal(response.status, status, JSON.stringify(result));
    return result;
  };
  const patient = await request("/patients", "POST", {
    name: "Workflow Test Patient", age: 5, gender: "Female",
    phone: "0000000000", dateOfBirth: "2021-09-01",
  }, 201);
  assert.match(patient.patientId, /^OPD-/);
  const found = await request(`/patients?patientId=${patient._id}`);
  assert.equal(found.items[0].patientId, patient.patientId);
  const booking = {
    patientId: patient._id, patientName: patient.name,
    doctor: "Dr. Ananya Sharma", appointmentDate: "2026-09-15",
    appointmentTime: "09:00", reason: "Routine review",
  };
  const appointment = await request("/appointments", "POST", booking, 201);
  assert.equal(appointment.status, "Scheduled");
  await request("/appointments", "POST", booking, 409);
  const queue = await request(`/visits?status=Waiting&patientId=${patient._id}`);
  assert.equal(queue.totalItems, 1, "booked patient must appear in waiting queue");
  const visit = queue.items[0];
  const immunizations = [{ vaccine: "Test record", dose: "1", dateGiven: "2026-09-15" }];
  await request(`/visits/${visit._id}`, "PATCH", { immunizations });
  assert.equal((await request(`/visits?status=Waiting&patientId=${patient._id}`)).totalItems, 1);
  await request(`/visits/${visit._id}`, "PATCH", {
    status: "Completed", diagnosis: "Routine review completed",
    vitals: { weight: "18", height: "110" }, immunizations,
  });
  assert.equal((await request(`/visits?status=Waiting&patientId=${patient._id}`)).totalItems, 0);
  const history = await request(`/visits?status=Completed&patientId=${patient._id}`);
  assert.equal(history.items[0].vitals.weight, "18");
  assert.equal(history.items[0].immunizations[0].vaccine, "Test record");
  const services = await request("/services?active=true");
  const service = services.find((item) => item.code === "CONS-GEN");
  const invoice = await request("/invoices", "POST", {
    patientId: patient._id, patientName: patient.name,
    items: [{ serviceId: service._id, name: service.name, rate: service.rate, quantity: 2 }],
    discount: 50, paymentMode: "Cash",
  }, 201);
  assert.equal(invoice.subtotal, 600);
  assert.equal(invoice.total, 550);
  assert.equal(invoice.status, "Paid");
  const bills = await request("/invoices?invoiceType=Service");
  assert.equal(bills.items[0]._id, invoice._id);
});
