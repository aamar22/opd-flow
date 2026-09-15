import ImmunizationRecords from "../../components/doctor/ImmunizationRecords";
import { isGrowthEligible, matchesPatient } from "../../utils/growth.mjs";
import { useEffect, useState } from "react";
import { visitApi, patientApi } from "../../services/api";
import PatientGrowthChart from "../../components/doctor/PatientGrowthChart";
import ConsultationAIFeatures from "../../components/doctor/ConsultationAIFeatures";
import Pagination from "../../components/common/Pagination";
import { printPrescription } from "../../utils/printPrescription";

const PAGE_SIZE = 25;
const STATUS_FILTERS = ["All", "Waiting", "Completed", "Dispensed"];
const emptyForm = {
  temperature: "",
  pulse: "",
  systolic: "",
  diastolic: "",
  respiratoryRate: "",
  spo2: "",
  weight: "",
  height: "",
  headCircumference: "",
  growthAgeMonths: "",
  growthZScore: "",
  growthReference: "",
  growthMetric: "weight",
  chiefComplaint: "",
  chiefComplaints: [],
  allergy: "",
  allergies: [],
  diagnosis: "",
  diagnoses: [],
  notes: "",
  clinicalNotes: [],
  medicine: "",
  dosage: "",
  days: "3",
  medicineEntries: [],
  vitalHistory: [],
};
const baseVitalFields = [
  ["temperature", "Temperature °F"],
  ["pulse", "Pulse bpm"],
  ["systolic", "BP systolic"],
  ["diastolic", "BP diastolic"],
  ["respiratoryRate", "Resp. rate"],
  ["spo2", "SpO₂ %"],
  ["weight", "Weight kg"],
];

export default function ConsultationQueuePage({ onComplete, clinicSettings }) {
  const [growthError, setGrowthError] = useState("");
  const [patientLookupError, setPatientLookupError] = useState("");
  const [patient, setPatient] = useState(null);
  const [active, setActive] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [visits, setVisits] = useState([]);
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [section, setSection] = useState("Vitals");
  const [statusFilter, setStatusFilter] = useState("Waiting");

  useEffect(() => {
    visitApi
      .getPage({
        page,
        limit: PAGE_SIZE,
        status: statusFilter === "All" ? undefined : statusFilter,
      })
      .then(({ data }) => {
        setVisits(data.items);
        setTotalItems(data.totalItems);
      });
  }, [page, reloadKey, statusFilter]);
  useEffect(() => {
    if (active)
      visitApi
        .getPage({ page: 1, limit: 5, patientId: active.patientId })
        .then(({ data }) =>
          setHistory(data.items.filter((visit) => visit._id !== active._id)),
        );
  }, [active]);

  const growthEligible =
    matchesPatient(patient, active?.patientId) && isGrowthEligible(patient);
  const vitalFields = [
    ...baseVitalFields,
    ...(growthEligible
      ? [
          ["height", "Height / length (cm)"],
          ["headCircumference", "Head circumference (cm)"],
          ["growthAgeMonths", "Age at reading (months)"],
          ["growthZScore", "Verified Z-score (optional)"],
          ["growthReference", "Z-score reference / source"],
        ]
      : []),
  ];
  useEffect(() => {
    let cancelled = false;
    setPatient(null);
    setPatientLookupError("");
    if (active)
      patientApi
        .getPage({
          patientId: active.patientId,
          search: active.patientId,
          limit: 100,
        })
        .then(({ data }) => {
          if (
            !cancelled &&
            !data.items.some((item) => matchesPatient(item, active.patientId))
          )
            setPatientLookupError(
              "Patient age could not be found. Growth charts require a linked patient aged 6 or younger.",
            );
          if (!cancelled)
            setPatient(
              data.items.find((item) =>
                matchesPatient(item, active.patientId),
              ) || null,
            );
        })
        .catch(() => {
          if (!cancelled) {
            setPatient(null);
            setPatientLookupError(
              "Could not load patient age. Reopen the patient record to retry loading growth charts.",
            );
          }
        });
    return () => {
      cancelled = true;
    };
  }, [active]);

  const set = (name) => (value) =>
    setForm((current) => ({ ...current, [name]: value }));
  const selectPatient = (visit) => {
    setGrowthError("");
    setActive(visit);
    setSection("Vitals");
    setForm({
      ...emptyForm,
      chiefComplaint: visit.chiefComplaint || visit.symptoms || "",
      chiefComplaints: visit.chiefComplaints || [],
      allergies: visit.allergies || [],
      diagnosis: visit.diagnosis || "",
      diagnoses: visit.diagnoses || [],
      notes: visit.notes || "",
      clinicalNotes: visit.clinicalNotes || [],
      medicineEntries: visit.medicines || [],
      vitalHistory: visit.vitalHistory || [],
      ...visit.vitals,
    });
  };
  const addAllergy = () => {
    const allergy = form.allergy.trim();
    if (allergy && !form.allergies.includes(allergy))
      setForm((current) => ({
        ...current,
        allergy: "",
        allergies: [...current.allergies, allergy],
      }));
  };
  const addTextEntry = (draftKey, listKey) => {
    const value = form[draftKey].trim();
    if (!value) return;
    setForm((current) => ({
      ...current,
      [draftKey]: "",
      [listKey]: [...current[listKey], value],
    }));
  };
  const removeEntry = (listKey, index) =>
    setForm((current) => ({
      ...current,
      [listKey]: current[listKey].filter((_, itemIndex) => itemIndex !== index),
    }));
  const addMedication = () => {
    if (!form.medicine.trim()) return;
    setForm((current) => ({
      ...current,
      medicine: "",
      dosage: "",
      days: "3",
      medicineEntries: [
        ...current.medicineEntries,
        {
          name: current.medicine.trim(),
          dosage: current.dosage.trim(),
          days: Number(current.days) || 1,
        },
      ],
    }));
  };
  const addVitalReading = () => {
    setGrowthError("");
    if (growthEligible) {
      if (
        ["height", "headCircumference", "weight"].some(
          (key) =>
            form[key] !== "" &&
            (!Number.isFinite(Number(form[key])) || Number(form[key]) <= 0),
        )
      ) {
        setGrowthError("Growth measurements must be positive numbers.");
        return;
      }
      if (
        form.growthAgeMonths !== "" &&
        (!Number.isFinite(Number(form.growthAgeMonths)) ||
          Number(form.growthAgeMonths) < 0 ||
          Number(form.growthAgeMonths) >= 84)
      ) {
        setGrowthError("Enter an age from 0 to less than 84 months.");
        return;
      }
      if (
        form.growthZScore !== "" &&
        (!Number.isFinite(Number(form.growthZScore)) ||
          !form.growthReference.trim())
      ) {
        setGrowthError("Enter a numeric Z-score and its reference/source.");
        return;
      }
    }
    const reading = Object.fromEntries(
      vitalFields.map(([name]) => [name, form[name]]),
    );
    if (!Object.values(reading).some(Boolean)) return;
    setForm((current) => ({
      ...current,
      vitalHistory: [
        ...current.vitalHistory,
        {
          ...reading,
          growthMetric: current.growthMetric,
          recordedAt: new Date().toISOString(),
        },
      ],
    }));
  };
  const save = async () => {
    const latestVitals = Object.fromEntries(
      vitalFields.map(([name]) => [name, form[name]]),
    );
    await visitApi.update(active._id, {
      status: "Completed",
      vitals: { ...latestVitals, growthMetric: form.growthMetric },
      vitalHistory: form.vitalHistory,
      chiefComplaint: form.chiefComplaints.join("; ") || form.chiefComplaint,
      chiefComplaints: form.chiefComplaints,
      allergies: form.allergies,
      diagnosis: form.diagnoses.join("; ") || form.diagnosis,
      diagnoses: form.diagnoses,
      notes: form.clinicalNotes.join("\n") || form.notes,
      clinicalNotes: form.clinicalNotes,
      medicines: form.medicineEntries,
    });
    setActive(null);
    setForm(emptyForm);
    setReloadKey((value) => value + 1);
    onComplete("Consultation saved and prescription forwarded to pharmacy.");
  };
  const print = () => {
    printPrescription({
      visit: active,
      clinicSettings,
      form: {
        vitals: Object.fromEntries(
          vitalFields.map(([name]) => [name, form[name]]),
        ),
        diagnosis: form.diagnoses.join("; ") || form.diagnosis,
        notes: form.clinicalNotes.join("\n") || form.notes,
        medicines: form.medicineEntries,
      },
    });
  };

  if (!active) {
    return (
      <section className="visitWorkspace">
        <div className="visitTopbar">
          <div>
            <p className="eyebrow">DOCTOR WORKLIST</p>
            <h2>Consultation queue</h2>
            <span>View and manage visits by their consultation status.</span>
          </div>
        </div>
        <div className="visitFilters">
          <div className="statusTabs">
            {STATUS_FILTERS.map((status) => (
              <button
                className={`statusTab ${statusFilter === status ? "selected" : ""}`}
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
              >
                {status}
              </button>
            ))}
          </div>
          <span className="queueCount">
            {totalItems} {statusFilter.toLowerCase()} visit(s)
          </span>
        </div>
        <div className="visitTableWrap">
          <table className="visitTable">
            <thead>
              <tr>
                <th>Patient details</th>
                <th>OPD / visit date</th>
                <th>Doctor</th>
                <th>Reason for visit</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visits.map((visit, index) => (
                <tr
                  className="visitRow"
                  onClick={() => selectPatient(visit)}
                  tabIndex="0"
                  key={visit._id}
                >
                  <td>
                    <div className="patientCell">
                      <span className="patientInitial">
                        {visit.patientName?.[0]}
                      </span>
                      <div>
                        <b>{visit.patientName}</b>
                        <small>{visit.patientId}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <b>
                      #
                      {String((page - 1) * PAGE_SIZE + index + 1).padStart(
                        4,
                        "0",
                      )}
                    </b>
                    <small>
                      {new Date(visit.createdAt).toLocaleDateString()}
                    </small>
                  </td>
                  <td>
                    <b>{visit.doctor}</b>
                    <small>{visit.department}</small>
                  </td>
                  <td className="reasonCell">
                    {visit.chiefComplaint || visit.symptoms}
                  </td>
                  <td>
                    <span
                      className={`badge ${visit.status === "Waiting" ? "waiting" : visit.status === "Completed" ? "complete" : "success"}`}
                    >
                      {visit.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="openVisit"
                      onClick={(event) => {
                        event.stopPropagation();
                        selectPatient(visit);
                      }}
                    >
                      Open →
                    </button>
                  </td>
                </tr>
              ))}
              {!visits.length && (
                <tr>
                  <td colSpan="6" className="empty">
                    No patients are waiting for consultation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalItems={totalItems}
          onPageChange={setPage}
        />
      </section>
    );
  }

  return (
    <div className="opdConsultation consultOpen">
      <section className="panel opdQueue">
        <div className="opdQueueHead">
          <h2>OPD patient queue</h2>
          <p>
            {totalItems} {statusFilter.toLowerCase()} visit(s)
          </p>
        </div>
        {visits.map((visit) => (
          <button
            className={`opdQueueRow ${active?._id === visit._id ? "active" : ""}`}
            onClick={() => selectPatient(visit)}
            key={visit._id}
          >
            <div className="avatar teal">{visit.patientName?.[0]}</div>
            <div>
              <b>{visit.patientName}</b>
              <small>{visit.patientId}</small>
              <small>
                {visit.department} · {visit.symptoms}
              </small>
            </div>
          </button>
        ))}
        {!visits.length && (
          <div className="empty">No patients in the queue.</div>
        )}
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalItems={totalItems}
          onPageChange={setPage}
        />
      </section>
      <section className="panel opdWorkspace">
        {!active ? (
          <div className="empty">
            Select a patient to start the OPD consultation.
          </div>
        ) : (
          <>
            <div className="opdPatientBar">
              <div>
                <h2>{active.patientName}</h2>
                <p>
                  {active.patientId} · {active.department} · {active.doctor}
                </p>
              </div>
              <div className="visitFullActions">
                <button
                  type="button"
                  className="visitBack"
                  aria-pressed={section === "AI Features"}
                  onClick={() => setSection("AI Features")}
                >
                  AI Features
                </button>
                <button className="visitBack" onClick={() => setActive(null)}>
                  ← Back to queue
                </button>
                <span className="badge waiting">In consultation</span>
              </div>
            </div>
            <div className="patientRecordLayout">
              <nav
                className="patientRecordSidebar"
                aria-label="Patient record tools"
              >
                {growthEligible && (
                  <button
                    type="button"
                    title="Growth Chart"
                    className={section === "Growth Chart" ? "active" : ""}
                    aria-pressed={section === "Growth Chart"}
                    onClick={() => setSection("Growth Chart")}
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 3v18h18M7 15l4-5 4 3 6-8" />
                      <path d="M17 5h4v4" />
                    </svg>
                    <span>Growth Chart</span>
                  </button>
                )}
                <button
                  type="button"
                  title="Immunization Records"
                  className={section === "Immunization Records" ? "active" : ""}
                  aria-pressed={section === "Immunization Records"}
                  onClick={() => setSection("Immunization Records")}
                >
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m18 2 4 4M17 7l3-3M14 5l5 5M15 6 5 16l3 3L18 9M5 16l-2 5 5-2M10 11l2 2M13 8l2 2" />
                  </svg>
                  <span>Immunization Records</span>
                </button>
                <button
                  type="button"
                  title="Diagnoses"
                  className={section === "Diagnoses" ? "active" : ""}
                  aria-pressed={section === "Diagnoses"}
                  onClick={() => setSection("Diagnoses")}
                >
                  <svg
                    width="26"
                    height="26"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="5" y="4" width="14" height="17" rx="2" />
                    <rect x="9" y="2" width="6" height="4" rx="1" />
                    <path d="M9 12h6M12 9v6M9 18h6" />
                  </svg>
                  <span>Diagnoses</span>
                </button>
              </nav>
              <div className="patientRecordMain">
                <nav className="opdSteps">
                  {[
                    "Vitals",
                    "Clinical notes",
                    "Diagnoses",
                    "Medication",
                    "Visit history",
                    "Immunization Records",
                    ...(growthEligible ? ["Growth Chart"] : []),
                  ].map((item) => (
                    <button
                      className={section === item ? "active" : ""}
                      onClick={() => setSection(item)}
                      key={item}
                    >
                      {item}
                    </button>
                  ))}
                </nav>
                <div className="opdContent">
                  {patientLookupError && (
                    <p role="alert">{patientLookupError}</p>
                  )}
                  {section === "Growth Chart" && growthEligible && (
                    <PatientGrowthChart
                      patient={patient}
                      visit={active}
                      readings={form.vitalHistory}
                      history={history.filter(
                        (visit) => visit.patientId === active.patientId,
                      )}
                      onRecord={() => setSection("Vitals")}
                    />
                  )}
                  <div hidden={section !== "Immunization Records"}>
                    <ImmunizationRecords
                      key={active._id}
                      visit={active}
                      patient={patient}
                      onSaved={(immunizations) => {
                        setActive((current) => ({ ...current, immunizations }));
                        setVisits((current) =>
                          current.map((item) =>
                            item._id === active._id
                              ? { ...item, immunizations }
                              : item,
                          ),
                        );
                      }}
                    />
                  </div>
                  <div hidden={section !== "AI Features"}>
                    <ConsultationAIFeatures
                      key={active._id}
                      onAddNotes={(text) => {
                        setForm((current) => ({
                          ...current,
                          notes: "",
                          clinicalNotes: [
                            ...current.clinicalNotes,
                            ...(current.notes.trim() &&
                            !current.clinicalNotes.includes(
                              current.notes.trim(),
                            )
                              ? [current.notes.trim()]
                              : []),
                            text,
                          ],
                        }));
                        setSection("Clinical notes");
                      }}
                    />
                  </div>
                  {section === "Vitals" && (
                    <section className="opdSection">
                      <h3>
                        Vitals <span>Record current measurements</span>
                      </h3>
                      {growthEligible && (
                        <p>
                          For growth graphs, enter age in months, weight,
                          height/length and head circumference, then add a vital
                          reading. Z-scores must be verified against a named
                          reference.
                        </p>
                      )}
                      {growthEligible && (
                        <label>
                          Z-score indicator
                          <select
                            value={form.growthMetric}
                            onChange={(event) =>
                              set("growthMetric")(event.target.value)
                            }
                          >
                            <option value="weight">Weight-for-age</option>
                            <option value="height">
                              Height/length-for-age
                            </option>
                            <option value="bmi">BMI-for-age</option>
                            <option value="head">
                              Head circumference-for-age
                            </option>
                            <option value="weightHeight">
                              Weight-for-height
                            </option>
                          </select>
                        </label>
                      )}
                      {growthError && <p role="alert">{growthError}</p>}
                      <div className="vitalsGrid">
                        {vitalFields.map(([name, label]) => (
                          <label key={name}>
                            {label}
                            <input
                              value={form[name]}
                              onChange={(event) =>
                                set(name)(event.target.value)
                              }
                              inputMode={
                                name === "growthReference" ? "text" : "decimal"
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <button
                        className="outlineButton addEntryButton"
                        type="button"
                        onClick={addVitalReading}
                      >
                        Add vital reading
                      </button>
                      {!!form.vitalHistory.length && (
                        <div className="entryList">
                          {form.vitalHistory.map((vital, index) => (
                            <span key={index}>
                              Reading {index + 1}: {vital.temperature || "—"}°F
                              · Pulse {vital.pulse || "—"} · BP{" "}
                              {vital.systolic || "—"}/{vital.diastolic || "—"}
                            </span>
                          ))}
                        </div>
                      )}
                    </section>
                  )}
                  {section === "Diagnoses" && (
                    <section className="opdSection">
                      <h3>Diagnoses</h3>
                      <p>
                        Add diagnoses for this consultation. They are saved when
                        you complete the consultation.
                      </p>
                      <div className="clinicalGrid">
                        <label>
                          Diagnosis
                          <div className="entryInput">
                            <textarea
                              value={form.diagnosis}
                              onChange={(event) =>
                                set("diagnosis")(event.target.value)
                              }
                            />
                            <button
                              className="outlineButton"
                              type="button"
                              onClick={() =>
                                addTextEntry("diagnosis", "diagnoses")
                              }
                            >
                              Add
                            </button>
                          </div>
                          <div className="entryList">
                            {form.diagnoses.map((item, index) => (
                              <span key={index}>
                                {item}
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeEntry("diagnoses", index)
                                  }
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </label>
                      </div>
                    </section>
                  )}
                  {section === "Clinical notes" && (
                    <section className="opdSection">
                      <h3>Clinical assessment</h3>
                      <div className="clinicalGrid">
                        <label>
                          Chief complaint
                          <div className="entryInput">
                            <textarea
                              value={form.chiefComplaint}
                              onChange={(event) =>
                                set("chiefComplaint")(event.target.value)
                              }
                            />
                            <button
                              className="outlineButton"
                              type="button"
                              onClick={() =>
                                addTextEntry(
                                  "chiefComplaint",
                                  "chiefComplaints",
                                )
                              }
                            >
                              Add
                            </button>
                          </div>
                          <div className="entryList">
                            {form.chiefComplaints.map((item, index) => (
                              <span key={index}>
                                {item}
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeEntry("chiefComplaints", index)
                                  }
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </label>
                        <label>
                          Diagnosis
                          <div className="entryInput">
                            <textarea
                              value={form.diagnosis}
                              onChange={(event) =>
                                set("diagnosis")(event.target.value)
                              }
                            />
                            <button
                              className="outlineButton"
                              type="button"
                              onClick={() =>
                                addTextEntry("diagnosis", "diagnoses")
                              }
                            >
                              Add
                            </button>
                          </div>
                          <div className="entryList">
                            {form.diagnoses.map((item, index) => (
                              <span key={index}>
                                {item}
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeEntry("diagnoses", index)
                                  }
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </label>
                        <label>
                          Allergies
                          <div className="allergyEntry">
                            <input
                              value={form.allergy}
                              onChange={(event) =>
                                set("allergy")(event.target.value)
                              }
                              onKeyDown={(event) =>
                                event.key === "Enter" &&
                                (event.preventDefault(), addAllergy())
                              }
                              placeholder="Add allergy"
                            />
                            <button
                              className="outlineButton"
                              type="button"
                              onClick={addAllergy}
                            >
                              Add
                            </button>
                          </div>
                          <div className="allergyChips">
                            {form.allergies.map((allergy) => (
                              <span className="allergyChip" key={allergy}>
                                {allergy}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((current) => ({
                                      ...current,
                                      allergies: current.allergies.filter(
                                        (item) => item !== allergy,
                                      ),
                                    }))
                                  }
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </label>
                        <label>
                          Clinical notes
                          <div className="entryInput">
                            <textarea
                              value={form.notes}
                              onChange={(event) =>
                                set("notes")(event.target.value)
                              }
                            />
                            <button
                              className="outlineButton"
                              type="button"
                              onClick={() =>
                                addTextEntry("notes", "clinicalNotes")
                              }
                            >
                              Add
                            </button>
                          </div>
                          <div className="entryList">
                            {form.clinicalNotes.map((item, index) => (
                              <span key={index}>
                                {item}
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeEntry("clinicalNotes", index)
                                  }
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </label>
                      </div>
                    </section>
                  )}
                  {section === "Medication" && (
                    <section className="opdSection">
                      <h3>Medication</h3>
                      <div className="medicineGrid">
                        <label>
                          Medicine name
                          <input
                            value={form.medicine}
                            onChange={(event) =>
                              set("medicine")(event.target.value)
                            }
                            placeholder="e.g. Paracetamol 500mg"
                          />
                        </label>
                        <label>
                          Dosage
                          <input
                            value={form.dosage}
                            onChange={(event) =>
                              set("dosage")(event.target.value)
                            }
                            placeholder="e.g. 1 tablet twice daily"
                          />
                        </label>
                        <label>
                          Days
                          <input
                            type="number"
                            min="1"
                            value={form.days}
                            onChange={(event) =>
                              set("days")(event.target.value)
                            }
                          />
                        </label>
                      </div>
                      <button
                        className="outlineButton addEntryButton"
                        type="button"
                        onClick={addMedication}
                      >
                        Add medication
                      </button>
                      <div className="entryList">
                        {form.medicineEntries.map((medicine, index) => (
                          <span key={index}>
                            {medicine.name} · {medicine.dosage || "No dosage"} ·{" "}
                            {medicine.days} day(s)
                            <button
                              type="button"
                              onClick={() =>
                                removeEntry("medicineEntries", index)
                              }
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </section>
                  )}
                  {section === "Visit history" && (
                    <section className="opdSection">
                      <h3>Recent visit history</h3>
                      <div className="visitHistory">
                        {history.length ? (
                          history.map((visit) => (
                            <div className="visitHistoryItem" key={visit._id}>
                              <b>
                                {visit.diagnosis ||
                                  visit.chiefComplaint ||
                                  visit.symptoms}
                              </b>
                              <small>
                                {new Date(visit.createdAt).toLocaleDateString()}{" "}
                                · {visit.status} · {visit.doctor}
                              </small>
                            </div>
                          ))
                        ) : (
                          <div className="empty">
                            No earlier visits recorded.
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                  <div className="consultActions">
                    <button
                      className="outlineButton"
                      onClick={() => selectPatient(active)}
                    >
                      Reset
                    </button>
                    <button className="outlineButton" onClick={print}>
                      Generate prescription
                    </button>
                    <button className="primary" onClick={save}>
                      Complete consultation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
