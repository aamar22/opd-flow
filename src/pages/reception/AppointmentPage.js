import { useEffect, useState } from "react";
import {
  appointmentApi,
  clinicSettingsApi,
  patientApi,
} from "../../services/api";
import Pagination from "../../components/common/Pagination";
import { printPrescription as printSharedPrescription } from "../../utils/printPrescription";

const today = new Date().toISOString().slice(0, 10);
const initialForm = {
  patientId: "",
  doctor: "",
  appointmentDate: today,
  appointmentTime: "09:00",
  endTime: "09:15",
  appointmentType: "New",
  paymentMode: "Cash",
  amount: "",
  reason: "",
};
const emptyManualPatient = {
  name: "",
  phone: "",
  age: "",
  gender: "Female",
  address: "",
};
const APPOINTMENTS_PER_PAGE = 5;

const escapePrintValue = (value) =>
  String(value ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

const printPrescription = (appointment, patient, clinicSettings) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.opener = null;
  printWindow.document
    .write(`<!doctype html><html><head><title>OPD Prescription</title><style>
    @page{size:A4;margin:10mm}*{box-sizing:border-box}body{margin:0;color:#151515;font:11px Arial,sans-serif}main{width:190mm;min-height:277mm;margin:auto}.clinic-header{min-height:24mm;display:flex;align-items:center;gap:10px;border-bottom:1px solid #aaa;padding:2mm 3mm}.clinic-header img{width:23mm;height:20mm;object-fit:contain}.clinic-name{color:#213b80;font-size:24px;font-weight:800;line-height:1;text-transform:uppercase}.clinic-subtitle{font-size:12px;font-weight:700}.clinic-contact{margin-left:auto;color:#555;font-size:9px;line-height:1.6;text-align:right}h1{font-size:13px;text-align:center;margin:16mm 0 4mm}.patient-area{display:grid;grid-template-columns:1.45fr 1fr;gap:12mm;padding:0 2mm 6mm;font-size:10px;line-height:1.55}.patient-area b{display:inline-block;min-width:28mm;font-size:9px}.patient-area span{font-weight:600}.rx-box{border:1.5px solid #222;min-height:190mm;padding:3mm 5mm}.rx-title{font-family:cursive;font-size:14px}.rx-note{margin-top:7mm;line-height:1.6;color:#333;white-space:pre-wrap}.signature{margin-top:120mm;text-align:right;font-size:10px}footer{border-top:1px solid #aaa;padding-top:3mm;font-size:8px;color:#666;display:flex;justify-content:space-between}
    </style></head><body><main><div class="clinic-header">${clinicSettings.logoUrl ? `<img src="${escapePrintValue(clinicSettings.logoUrl)}" alt="Clinic logo">` : ""}<div><div class="clinic-name">${escapePrintValue(clinicSettings.clinicName)}</div><div class="clinic-subtitle">OPD &amp; PRESCRIPTION SERVICES</div></div><div class="clinic-contact">${escapePrintValue(clinicSettings.address || "Clinic address")}<br>${escapePrintValue(clinicSettings.phone || "Phone")}</div></div><h1>OPD PRESCRIPTION</h1><section class="patient-area"><div><div><b>UHID NO.</b><span>: ${escapePrintValue(appointment.patientId)}</span></div><div><b>PATIENT NAME</b><span>: ${escapePrintValue(appointment.patientName)}</span></div><div><b>AGE / SEX</b><span>: ${escapePrintValue(patient ? `${patient.age || "—"} / ${patient.gender || "—"}` : "—")}</span></div><div><b>MOB. NO.</b><span>: ${escapePrintValue(patient?.phone)}</span></div><div><b>DEPARTMENT</b><span>: ${escapePrintValue(appointment.department)}</span></div><div><b>ADDRESS</b><span>: ${escapePrintValue(patient?.address)}</span></div></div><div><div><b>OPD DATE</b><span>: ${escapePrintValue(appointment.appointmentDate)}</span></div><div><b>CATEGORY</b><span>: ${escapePrintValue(appointment.appointmentType)}</span></div><div><b>STATUS</b><span>: ${escapePrintValue(appointment.status)}</span></div><div><b>DOCTOR</b><span>: ${escapePrintValue(appointment.doctor)}</span></div><div><b>TIME</b><span>: ${escapePrintValue(appointment.appointmentTime)}</span></div></div></section><section class="rx-box"><div class="rx-title">Rx</div><div class="rx-note">${escapePrintValue(appointment.reason || "")}</div><div class="signature">Doctor signature<br><br>________________________</div></section><footer><span>Generated from ${escapePrintValue(clinicSettings.clinicName)}</span><span>Please carry this prescription for your consultation.</span></footer></main><script>window.onload=()=>window.print()<\/script></body></html>`);
  printWindow.document.close();
  return;

  const detail = (label, value) =>
    `<div><b>${label}</b><span>: ${escapePrintValue(value)}</span></div>`;
  const departments = [
    "Casualty / Emergency",
    "General Medicine",
    "T.B. & Chest",
    "Dermatology",
    "Psychiatry",
    "Paediatrics",
    "General Surgery",
    "Orthopaedics",
    "Ophthalmology",
    "ENT",
    "Obst. & Gynaecology",
    "Dental",
  ];
  printWindow.document
    .write(`<!doctype html><html><head><title>OPD Prescription - ${escapePrintValue(appointment.patientName)}</title><style>
    @page{size:A4;margin:10mm}*{box-sizing:border-box}body{margin:0;color:#151515;font:11px Arial,sans-serif}main{width:190mm;min-height:277mm;margin:auto}.clinic-header{min-height:24mm;display:flex;align-items:center;gap:10px;border-bottom:1px solid #aaa;padding:2mm 3mm}.clinic-header img{width:23mm;height:20mm;object-fit:contain}.clinic-name{color:#213b80;font-size:24px;font-weight:800;line-height:1;text-transform:uppercase}.clinic-subtitle{font-size:12px;font-weight:700}.clinic-contact{margin-left:auto;color:#555;font-size:9px;line-height:1.6;text-align:right}h1{font-size:13px;text-align:center;margin:16mm 0 4mm}.patient-area{display:grid;grid-template-columns:1.45fr 1fr;gap:12mm;padding:0 2mm 6mm;font-size:10px;line-height:1.55}.patient-area b{display:inline-block;min-width:28mm;font-size:9px}.patient-area span{font-weight:600}.rx-box{display:grid;grid-template-columns:64mm 1fr;border:1.5px solid #222;min-height:190mm}.department-list{border-right:1.5px solid #222;padding:25mm 2mm 4mm;display:flex;flex-direction:column;gap:7mm;font-size:10px;text-transform:uppercase}.department-list .selected{font-weight:800;text-decoration:underline}.rx-area{padding:3mm 5mm}.rx-title{font-family:cursive;font-size:14px}.rx-note{margin-top:7mm;line-height:1.6;color:#333}.signature{margin-top:120mm;text-align:right;font-size:10px}footer{border-top:1px solid #aaa;padding-top:3mm;font-size:8px;color:#666;display:flex;justify-content:space-between}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body><main><div class="clinic-header">${clinicSettings.logoUrl ? `<img src="${escapePrintValue(clinicSettings.logoUrl)}" alt="Clinic logo">` : ""}<div><div class="clinic-name">${escapePrintValue(clinicSettings.clinicName)}</div><div class="clinic-subtitle">OPD &amp; PRESCRIPTION SERVICES</div></div><div class="clinic-contact">${escapePrintValue(clinicSettings.address || "Clinic address")}<br>${escapePrintValue(clinicSettings.phone || "Phone: —")}<br>${escapePrintValue(clinicSettings.email || "")}</div></div><h1>OPD PRESCRIPTION</h1><section class="patient-area"><div>${detail("UHID NO.", appointment.patientId)}${detail("PATIENT NAME", appointment.patientName)}${detail("GUARDIAN NAME", patient?.guardianName || "—")}${detail("AGE / SEX", patient ? `${patient.age || "—"} / ${patient.gender || "—"}` : "—")}${detail("MOB. NO.", patient?.phone)}${detail("DEPARTMENT", appointment.department)}${detail("ADDRESS", patient?.address)}</div><div>${detail("OPD DATE", appointment.appointmentDate)}${detail("CATEGORY", appointment.appointmentType)}${detail("REG. DATE", appointment.appointmentDate)}${detail("STATUS", appointment.status)}${detail("DOCTOR", appointment.doctor)}${detail("TIME", `${appointment.appointmentTime}${appointment.endTime ? ` – ${appointment.endTime}` : ""}`)}</div></section><section class="rx-box"><aside class="department-list">${departments.map((department) => `<span class="${department.toLowerCase() === String(appointment.department).toLowerCase() ? "selected" : ""}">${escapePrintValue(department)}</span>`).join("")}</aside><article class="rx-area"><div class="rx-title">Rx</div><p class="rx-note">${escapePrintValue(appointment.reason || "")}</p><div class="signature">Doctor signature<br><br>________________________</div></article></section><footer><span>Generated from ${escapePrintValue(clinicSettings.clinicName)}</span><span>Please carry this prescription for your consultation.</span></footer></main><script>window.onload=()=>window.print()<\/script></body></html>`);
  printWindow.document.close();
  return;

  const field = (label, value) => `
    <div class="field"><span>${label}</span><strong>${escapePrintValue(value)}</strong></div>
  `;
  const patientDetails = [
    field("Patient name", appointment.patientName),
    field("UHID", appointment.patientId),
    field("Mobile", patient?.phone),
    field(
      "Age / gender",
      patient ? `${patient.age || "—"} years / ${patient.gender || "—"}` : "—",
    ),
    field("Address", patient?.address),
  ].join("");

  printWindow.document.write(`<!doctype html>
    <html><head><title>Prescription - ${escapePrintValue(appointment.patientName)}</title>
    <style>
      * { box-sizing: border-box; } body { margin: 0; color: #16273a; font: 14px Arial, sans-serif; }
      main { max-width: 760px; margin: 32px auto; padding: 30px; border: 1px solid #dbe4ea; }
      header { display: flex; justify-content: space-between; border-bottom: 2px solid #1769e0; padding-bottom: 18px; } .clinic { display:flex; gap:10px; align-items:center; } .clinic img { width:48px; height:48px; object-fit:contain; }
      h1 { margin: 0 0 4px; font-size: 25px; } h2 { font-size: 15px; margin: 25px 0 10px; }
      p { margin: 3px 0; color: #617184; } .label { color: #1769e0; font-size: 11px; font-weight: bold; letter-spacing: 1px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #dbe4ea; border-radius: 6px; overflow: hidden; }
      .field { padding: 11px 13px; border-bottom: 1px solid #e7edf1; } .field span { display: block; color: #718092; font-size: 11px; margin-bottom: 4px; } .field strong { font-size: 13px; }
      .summary { background: #f5f9ff; padding: 15px; border-left: 4px solid #1769e0; line-height: 1.6; }
      footer { margin-top: 46px; display: flex; justify-content: space-between; color: #718092; font-size: 12px; }
      @media print { main { margin: 0; border: 0; } }
    </style></head><body><main>
      <header><div class="clinic">${clinicSettings.logoUrl ? `<img src="${escapePrintValue(clinicSettings.logoUrl)}" alt="" />` : ""}<div><div class="label">${escapePrintValue(clinicSettings.clinicName)}</div><h1>Prescription / Appointment Summary</h1><p>Please present this document at the clinic.</p></div></div><div><div class="label">APPOINTMENT DATE</div><strong>${escapePrintValue(appointment.appointmentDate)}</strong><p>${escapePrintValue(appointment.appointmentTime)}${appointment.endTime ? ` - ${escapePrintValue(appointment.endTime)}` : ""}</p></div></header>
      <h2>Patient details</h2><section class="grid">${patientDetails}</section>
      <h2>Consultation</h2><section class="grid">${field("Consulting doctor", appointment.doctor)}${field("Department", appointment.department)}${field("Appointment type", appointment.appointmentType)}${field("Status", appointment.status === "Cancelled" ? "Cancelled" : "Booked")}</section>
      <h2>Notes</h2><div class="summary">${escapePrintValue(appointment.reason || "No notes provided.")}</div>
      <footer><span>Generated from OPD Flow</span><span>Doctor signature: ____________________</span></footer>
    </main><script>window.onload = () => { window.print(); }<\/script></body></html>`);
  printWindow.document.close();
};

export default function AppointmentPage({ onComplete, clinicSettings }) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [patientSearch, setPatientSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [appointmentPage, setAppointmentPage] = useState(1);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualPatient, setManualPatient] = useState(emptyManualPatient);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [debouncedAppointmentSearch, setDebouncedAppointmentSearch] =
    useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [availableSlots, setAvailableSlots] = useState([]);

  useEffect(() => {
    if (!form.doctor && clinicSettings.doctors?.[0])
      setForm((current) => ({
        ...current,
        doctor: clinicSettings.doctors[0].name,
      }));
  }, [clinicSettings.doctors, form.doctor]);
  useEffect(() => {
    if (!form.doctor || !form.appointmentDate) {
      setAvailableSlots([]);
      return;
    }
    clinicSettingsApi
      .getAvailability({ doctor: form.doctor, date: form.appointmentDate })
      .then(({ data }) => {
        setAvailableSlots(data.slots);
        setForm((current) =>
          data.slots.includes(current.appointmentTime)
            ? current
            : { ...current, appointmentTime: data.slots[0] || "", endTime: "" },
        );
      })
      .catch(() => setAvailableSlots([]));
  }, [form.doctor, form.appointmentDate, reloadKey]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedAppointmentSearch(appointmentSearch.trim()),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [appointmentSearch]);
  useEffect(() => {
    let cancelled = false;
    appointmentApi
      .getPage({
        page: appointmentPage,
        limit: APPOINTMENTS_PER_PAGE,
        search: debouncedAppointmentSearch || undefined,
      })
      .then(({ data }) => {
        if (!cancelled) {
          setAppointments(data.items);
          setTotalAppointments(data.totalItems);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [appointmentPage, debouncedAppointmentSearch, reloadKey]);
  useEffect(() => {
    const term = patientSearch.trim();
    if (!term || !isSearchFocused) {
      setSearchResults([]);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      patientApi
        .getPage({ page: 1, limit: 10, search: term })
        .then(({ data }) => setSearchResults(data.items));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [patientSearch, isSearchFocused]);

  const set = (name) => (value) => setForm({ ...form, [name]: value });
  const setManual = (name) => (value) =>
    setManualPatient({ ...manualPatient, [name]: value });
  const openBooking = () => {
    setForm({
      ...initialForm,
      doctor: clinicSettings.doctors?.[0]?.name || "",
    });
    setPatientSearch("");
    setSelectedPatient(null);
    setIsManualEntry(false);
    setManualPatient(emptyManualPatient);
    setIsBookingOpen(true);
  };
  const choosePatient = (patient) => {
    setForm({ ...form, patientId: patient._id });
    setSelectedPatient(patient);
    setIsManualEntry(false);
    setPatientSearch(`${patient.name} · ${patient.patientId}`);
    setIsSearchFocused(false);
  };
  const startManualEntry = () => {
    setForm({ ...form, patientId: "" });
    setManualPatient({ ...emptyManualPatient, name: patientSearch });
    setIsManualEntry(true);
    setIsSearchFocused(false);
  };
  const submit = async (event) => {
    event.preventDefault();
    let appointmentPatient = selectedPatient;
    if (isManualEntry) {
      appointmentPatient = (
        await patientApi.create({
          ...manualPatient,
          age: Number(manualPatient.age),
        })
      ).data;
    }
    if (!appointmentPatient) return;
    const doctor = clinicSettings.doctors.find(
      (item) => item.name === form.doctor,
    );
    const { data: createdAppointment } = await appointmentApi.create({
      patientId: appointmentPatient._id,
      patientName: appointmentPatient.name,
      doctor: form.doctor,
      department: doctor?.department,
      appointmentDate: form.appointmentDate,
      appointmentTime: form.appointmentTime,
      endTime: form.endTime,
      appointmentType: form.appointmentType,
      paymentMode: form.paymentMode,
      amount: form.amount ? Number(form.amount) : undefined,
      reason: form.reason,
    });
    setIsBookingOpen(false);
    setAppointmentPage(1);
    setAppointments((current) =>
      [createdAppointment, ...current].slice(0, APPOINTMENTS_PER_PAGE),
    );
    setTotalAppointments((current) => current + 1);
    setReloadKey((value) => value + 1);
    onComplete(
      isManualEntry
        ? "Patient registered, appointment booked, and added to the OPD visit list."
        : "Appointment booked and added to the OPD visit list.",
    );
  };
  const cancel = async (id) => {
    await appointmentApi.update(id, { status: "Cancelled" });
    setReloadKey((value) => value + 1);
    onComplete("Appointment cancelled.");
  };
  const print = (appointment) => {
    printSharedPrescription({
      visit: appointment,
      patient:
        selectedPatient?._id === appointment.patientId ? selectedPatient : null,
      clinicSettings,
    });
  };

  return (
    <section className="appointmentWorkspace">
      <div className="appointmentHeader">
        <div>
          <h2>Appointments</h2>
          <p>Manage patient appointments and schedules</p>
        </div>
        <button className="appointmentPrimary" onClick={openBooking}>
          + New appointment
        </button>
      </div>

      <section className="appointmentTablePanel">
        <div className="appointmentListToolbar">
          <label className="appointmentListSearch">
            <span>⌕</span>
            <input
              value={appointmentSearch}
              onChange={(event) => {
                setAppointmentSearch(event.target.value);
                setAppointmentPage(1);
              }}
              placeholder="Search patient, UHID, mobile…"
              aria-label="Search appointments"
            />
          </label>
          <span>{totalAppointments} appointment(s)</span>
        </div>
        <div className="appointmentTableWrap">
          <table className="appointmentTable">
            <thead>
              <tr>
                <th>Patient details</th>
                <th>Appointment</th>
                <th>Doctor</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appointment) => (
                <tr key={appointment._id}>
                  <td>
                    <div className="appointmentPatient">
                      <span>{appointment.patientName?.[0]}</span>
                      <div>
                        <b>{appointment.patientName}</b>
                        <small>UHID: {appointment.patientId}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <b>{appointment.appointmentDate}</b>
                    <small>{appointment.appointmentTime}</small>
                  </td>
                  <td>
                    {appointment.doctor}
                    <small>{appointment.department}</small>
                  </td>
                  <td>
                    <span
                      className={`appointmentStatus ${appointment.status === "Cancelled" ? "cancelled" : "booked"}`}
                    >
                      {appointment.status === "Cancelled"
                        ? "Cancelled"
                        : "Booked"}
                    </span>
                  </td>
                  <td>{appointment.reason || "—"}</td>
                  <td>
                    <div className="appointmentActions">
                      <button
                        type="button"
                        className="printPrescriptionButton"
                        onClick={() => print(appointment)}
                        aria-label={`Print prescription for ${appointment.patientName}`}
                        title="Print prescription / save as PDF"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M6 9V3h12v6M6 18H4V10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8h-2M6 14h12v7H6zM8 11h.01" />
                        </svg>
                        <span>Print</span>
                      </button>
                      {appointment.status === "Scheduled" && (
                        <button
                          className="cancelButton"
                          onClick={() => cancel(appointment._id)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!appointments.length && (
                <tr>
                  <td colSpan="6" className="empty">
                    No appointments booked yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={appointmentPage}
          pageSize={APPOINTMENTS_PER_PAGE}
          totalItems={totalAppointments}
          onPageChange={setAppointmentPage}
        />
      </section>

      {isBookingOpen && (
        <div
          className="appointmentModalBackdrop"
          onMouseDown={() => setIsBookingOpen(false)}
        >
          <section
            className="appointmentModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="appointment-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="appointmentModalHead">
              <h3 id="appointment-modal-title">Add new appointment</h3>
              <button
                className="modalClose"
                type="button"
                onClick={() => setIsBookingOpen(false)}
                aria-label="Close appointment booking"
              >
                ×
              </button>
            </div>
            <form onSubmit={submit}>
              <div className="bookingSearch">
                <label>
                  Search patient
                  <input
                    value={patientSearch}
                    onChange={(event) => {
                      setPatientSearch(event.target.value);
                      setForm({ ...form, patientId: "" });
                      setIsManualEntry(false);
                    }}
                    onFocus={() => setIsSearchFocused(true)}
                    placeholder="Name, UHID, mobile…"
                    autoComplete="off"
                  />
                </label>
                {isSearchFocused && searchResults.length > 0 && (
                  <div className="patientResults">
                    {searchResults.map((patient) => (
                      <button
                        type="button"
                        onClick={() => choosePatient(patient)}
                        key={patient._id}
                      >
                        <b>{patient.name}</b>
                        <span>
                          {patient.patientId} · {patient.phone}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {isSearchFocused &&
                  patientSearch.trim() &&
                  !searchResults.length && (
                    <div className="patientNotFound">
                      <span>No matching patient found.</span>
                      <button type="button" onClick={startManualEntry}>
                        Enter patient details manually
                      </button>
                    </div>
                  )}
              </div>

              <div className="bookingGrid bookingGridTwo">
                <label>
                  Name <em>*</em>
                  <input
                    value={
                      isManualEntry
                        ? manualPatient.name
                        : selectedPatient?.name || ""
                    }
                    onChange={(event) => setManual("name")(event.target.value)}
                    readOnly={!isManualEntry}
                    required={isManualEntry}
                    placeholder="Select a patient"
                  />
                </label>
                <label>
                  Mobile <em>*</em>
                  <input
                    value={
                      isManualEntry
                        ? manualPatient.phone
                        : selectedPatient?.phone || ""
                    }
                    onChange={(event) => setManual("phone")(event.target.value)}
                    readOnly={!isManualEntry}
                    required={isManualEntry}
                    placeholder="Select a patient"
                  />
                </label>
              </div>
              <div className="bookingGrid bookingGridThree">
                <label>
                  UHID
                  <input
                    value={selectedPatient?.patientId || "Auto-generated"}
                    readOnly
                  />
                </label>
                <label>
                  Appointment type <em>*</em>
                  <select
                    value={form.appointmentType}
                    onChange={(event) =>
                      set("appointmentType")(event.target.value)
                    }
                  >
                    <option>New</option>
                    <option>Follow-up</option>
                  </select>
                </label>
                <label>
                  Gender
                  {isManualEntry ? (
                    <select
                      value={manualPatient.gender}
                      onChange={(event) =>
                        setManual("gender")(event.target.value)
                      }
                    >
                      <option>Female</option>
                      <option>Male</option>
                      <option>Other</option>
                    </select>
                  ) : (
                    <input value={selectedPatient?.gender || ""} readOnly />
                  )}
                </label>
              </div>
              <div className="bookingGrid bookingGridThree">
                <label>
                  Age
                  <input
                    type={isManualEntry ? "number" : "text"}
                    min={isManualEntry ? "0" : undefined}
                    value={
                      isManualEntry
                        ? manualPatient.age
                        : selectedPatient?.age
                          ? `${selectedPatient.age} years`
                          : ""
                    }
                    onChange={(event) => setManual("age")(event.target.value)}
                    readOnly={!isManualEntry}
                    required={isManualEntry}
                  />
                </label>
                <label>
                  Address
                  <input
                    value={
                      isManualEntry
                        ? manualPatient.address
                        : selectedPatient?.address || ""
                    }
                    onChange={(event) =>
                      setManual("address")(event.target.value)
                    }
                    readOnly={!isManualEntry}
                  />
                </label>
                <label>
                  Consulting doctor <em>*</em>
                  <select
                    value={form.doctor}
                    onChange={(event) => set("doctor")(event.target.value)}
                  >
                    {clinicSettings.doctors.map((doctor) => (
                      <option key={doctor.name}>{doctor.name}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Reason for appointment <em>*</em>
                <input
                  value={form.reason}
                  onChange={(event) => set("reason")(event.target.value)}
                  required
                />
              </label>
              <div className="bookingGrid bookingGridThree">
                <label>
                  Date <em>*</em>
                  <input
                    type="date"
                    value={form.appointmentDate}
                    onChange={(event) =>
                      set("appointmentDate")(event.target.value)
                    }
                    required
                  />
                </label>
                <label>
                  Time from <em>*</em>
                  <select
                    value={form.appointmentTime}
                    onChange={(event) =>
                      set("appointmentTime")(event.target.value)
                    }
                    required
                    disabled={!availableSlots.length}
                  >
                    {!availableSlots.length && (
                      <option value="">No slots available</option>
                    )}
                    {availableSlots.map((slot) => (
                      <option key={slot}>{slot}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Time to
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(event) => set("endTime")(event.target.value)}
                  />
                </label>
              </div>
              <div className="bookingGrid bookingGridTwo">
                <label>
                  Amount
                  <input
                    type="number"
                    min="0"
                    value={form.amount}
                    onChange={(event) => set("amount")(event.target.value)}
                  />
                </label>
                <label>
                  Payment mode <em>*</em>
                  <select
                    value={form.paymentMode}
                    onChange={(event) => set("paymentMode")(event.target.value)}
                  >
                    <option>Cash</option>
                    <option>Card</option>
                    <option>UPI</option>
                  </select>
                </label>
              </div>
              <div className="appointmentModalActions">
                <button type="button" onClick={() => setIsBookingOpen(false)}>
                  Close
                </button>
                <button
                  className="appointmentPrimary"
                  disabled={!selectedPatient && !isManualEntry}
                >
                  Save appointment
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
