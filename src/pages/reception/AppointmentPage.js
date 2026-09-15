import { useEffect, useState } from "react";
import {
  appointmentApi,
  clinicSettingsApi,
  patientApi,
} from "../../services/api";
import Pagination from "../../components/common/Pagination";
import { appointmentPrintHtml } from "../../utils/appointmentPrint.mjs";

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
  const print = async (appointment) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      onComplete("Allow pop-ups to print the outpatient sheet.");
      return;
    }
    printWindow.opener = null;
    printWindow.document.body.textContent = "Preparing outpatient sheet...";
    try {
      const { data } = await patientApi.getPage({ patientId: appointment.patientId, limit: 1 });
      const patient = data.items.find((item) =>
        String(item._id) === String(appointment.patientId) || item.patientId === appointment.patientId,
      );
      if (!patient) throw new Error("Patient record not found");
      if (printWindow.closed) return;
      printWindow.document.open();
      printWindow.document.write(appointmentPrintHtml({ appointment, patient, clinicSettings }));
      printWindow.document.close();
      await Promise.all(Array.from(printWindow.document.images).map((image) =>
        image.complete ? Promise.resolve() : new Promise((resolve) => {
          image.onload = resolve;
          image.onerror = resolve;
          setTimeout(resolve, 3000);
        }),
      ));
      if (!printWindow.closed) {
        printWindow.focus();
        printWindow.print();
      }
    } catch {
      if (!printWindow.closed) printWindow.document.body.textContent = "Unable to load the patient record. Close this tab and try printing again.";
      onComplete("Could not prepare the outpatient sheet. Please try again.");
    }
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
                        aria-label={`Print outpatient sheet for ${appointment.patientName}`}
                        title="Print outpatient sheet / save as PDF"
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
