import { useEffect, useState } from "react";
import { ipdApi, patientApi, visitApi } from "../../services/api";

const blank = {
  patient: null,
  search: "",
  sourceVisitId: "",
  doctor: "",
  diagnosis: "",
  wardId: "",
  bedId: "",
};
const blankDirectPatient = {
  name: "",
  age: "",
  gender: "Female",
  phone: "",
  address: "",
};
export default function IPDAdmissionsPage({ onComplete, navigationContext }) {
  const [admissionMode, setAdmissionMode] = useState("existing");
  const [form, setForm] = useState(blank);
  const [directPatient, setDirectPatient] = useState(blankDirectPatient);
  const [patients, setPatients] = useState([]);
  const [visits, setVisits] = useState([]);
  const [wards, setWards] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [transfer, setTransfer] = useState({
    admission: null,
    wardId: "",
    bedId: "",
  });
  const load = () =>
    Promise.all([
      ipdApi.getWards(),
      ipdApi.getAdmissions({ status: "Admitted" }),
    ]).then(([wardResponse, admissionResponse]) => {
      setWards(wardResponse.data);
      setAdmissions(admissionResponse.data);
    });
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (navigationContext?.mode !== "direct") return;
    setAdmissionMode("direct");
    setForm({
      ...blank,
      wardId: navigationContext.wardId || "",
      bedId: navigationContext.bedId || "",
    });
    setDirectPatient(blankDirectPatient);
    setPatients([]);
    setVisits([]);
  }, [navigationContext]);
  useEffect(() => {
    if (admissionMode !== "existing" || !form.search.trim() || form.patient)
      return setPatients([]);
    const timer = setTimeout(
      () =>
        patientApi
          .getPage({ page: 1, limit: 6, search: form.search })
          .then(({ data }) => setPatients(data.items)),
      250,
    );
    return () => clearTimeout(timer);
  }, [admissionMode, form.search, form.patient]);
  const changeMode = (mode) => {
    setAdmissionMode(mode);
    setForm(blank);
    setDirectPatient(blankDirectPatient);
    setPatients([]);
    setVisits([]);
  };
  const selectPatient = async (patient) => {
    const { data } = await visitApi.getPage({
      page: 1,
      limit: 10,
      patientId: patient._id,
    });
    setVisits(data.items);
    setPatients([]);
    setForm({
      ...blank,
      patient,
      search: `${patient.name} · ${patient.patientId}`,
    });
  };
  const selectVisit = (visitId) => {
    const visit = visits.find((item) => item._id === visitId);
    setForm({
      ...form,
      sourceVisitId: visitId,
      doctor: visit?.doctor || form.doctor,
      diagnosis: visit?.diagnosis || form.diagnosis,
    });
  };
  const ward = wards.find((item) => item._id === form.wardId);
  const availableBeds =
    ward?.beds.filter((bed) => bed.status === "Available") || [];
  const admit = async (event) => {
    event.preventDefault();
    let patient = form.patient;
    if (admissionMode === "direct") {
      patient = (
        await patientApi.create({
          ...directPatient,
          age: Number(directPatient.age),
        })
      ).data;
    }
    await ipdApi.admit({ ...form, patientId: patient._id });
    setForm(blank);
    setDirectPatient(blankDirectPatient);
    setVisits([]);
    load();
    onComplete(
      admissionMode === "direct"
        ? "Patient registered directly in IPD and bed allocated."
        : "OP patient converted to IPD and bed allocated.",
    );
  };
  const discharge = async (id) => {
    await ipdApi.discharge(id);
    load();
    onComplete("Patient discharged and bed released.");
  };
  const transferWard = wards.find((item) => item._id === transfer.wardId);
  const transferBeds =
    transferWard?.beds.filter((bed) => bed.status === "Available") || [];
  const transferBed = async (event) => {
    event.preventDefault();
    await ipdApi.transfer(transfer.admission._id, {
      wardId: transfer.wardId,
      bedId: transfer.bedId,
    });
    setTransfer({ admission: null, wardId: "", bedId: "" });
    load();
    onComplete("Patient transferred and previous bed released.");
  };
  return (
    <section className="billingWorkspace">
      <div className="appointmentHeader">
        <div>
          <h2>IPD Admissions</h2>
          <p>
            Admit an existing OP patient or register a patient directly in IPD
          </p>
        </div>
      </div>
      <div className="billingGrid">
        <form className="masterCard" onSubmit={admit}>
          <h3>New IPD admission</h3>
          <div className="ipdModeTabs">
            <button
              type="button"
              className={admissionMode === "existing" ? "active" : ""}
              onClick={() => changeMode("existing")}
            >
              Existing OP patient
            </button>
            <button
              type="button"
              className={admissionMode === "direct" ? "active" : ""}
              onClick={() => changeMode("direct")}
            >
              Direct IP admission
            </button>
          </div>
          {admissionMode === "existing" ? (
            <>
              <label>
                Search OP patient
                <input
                  required
                  value={form.search}
                  placeholder="Name, UHID, phone"
                  onChange={(e) =>
                    setForm({ ...form, search: e.target.value, patient: null })
                  }
                />
              </label>
              {!!patients.length && (
                <div className="patientResults">
                  {patients.map((patient) => (
                    <button
                      type="button"
                      key={patient._id}
                      onClick={() => selectPatient(patient)}
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
                  {form.patient.age} years / {form.patient.gender}
                </p>
              )}
              <label>
                Source OP visit
                <select
                  value={form.sourceVisitId}
                  onChange={(e) => selectVisit(e.target.value)}
                >
                  <option value="">No linked visit</option>
                  {visits.map((visit) => (
                    <option key={visit._id} value={visit._id}>
                      {new Date(visit.createdAt).toLocaleDateString()} ·{" "}
                      {visit.doctor} · {visit.diagnosis || visit.symptoms}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <section className="directPatientFields">
              <p className="masterHint">
                A UHID will be generated automatically for this patient.
              </p>
              <label>
                Patient name
                <input
                  required
                  value={directPatient.name}
                  onChange={(e) =>
                    setDirectPatient({ ...directPatient, name: e.target.value })
                  }
                />
              </label>
              <div className="grid2">
                <label>
                  Age
                  <input
                    required
                    type="number"
                    min="0"
                    value={directPatient.age}
                    onChange={(e) =>
                      setDirectPatient({
                        ...directPatient,
                        age: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Gender
                  <select
                    value={directPatient.gender}
                    onChange={(e) =>
                      setDirectPatient({
                        ...directPatient,
                        gender: e.target.value,
                      })
                    }
                  >
                    <option>Female</option>
                    <option>Male</option>
                    <option>Other</option>
                  </select>
                </label>
              </div>
              <label>
                Phone number
                <input
                  required
                  value={directPatient.phone}
                  onChange={(e) =>
                    setDirectPatient({
                      ...directPatient,
                      phone: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Address
                <textarea
                  value={directPatient.address}
                  onChange={(e) =>
                    setDirectPatient({
                      ...directPatient,
                      address: e.target.value,
                    })
                  }
                />
              </label>
            </section>
          )}
          <div className="grid2">
            <label>
              Admitting doctor
              <input
                required
                value={form.doctor}
                onChange={(e) => setForm({ ...form, doctor: e.target.value })}
              />
            </label>
            <label>
              Diagnosis
              <input
                value={form.diagnosis}
                onChange={(e) =>
                  setForm({ ...form, diagnosis: e.target.value })
                }
              />
            </label>
          </div>
          <div className="grid2">
            <label>
              Ward
              <select
                required
                value={form.wardId}
                onChange={(e) =>
                  setForm({ ...form, wardId: e.target.value, bedId: "" })
                }
              >
                <option value="">Select ward</option>
                {wards.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name} · {item.floor}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Available bed
              <select
                required
                value={form.bedId}
                onChange={(e) => setForm({ ...form, bedId: e.target.value })}
              >
                <option value="">Select bed</option>
                {availableBeds.map((bed) => (
                  <option key={bed._id} value={bed._id}>
                    {bed.bedNumber} · {bed.bedType} · ₹{bed.dailyRate}/day
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            className="appointmentPrimary"
            disabled={
              (admissionMode === "existing" && !form.patient) || !form.bedId
            }
          >
            Admit and allocate bed
          </button>
        </form>
        <section className="masterCard">
          <h3>Currently admitted patients</h3>
          {transfer.admission && (
            <form className="bedTransferForm" onSubmit={transferBed}>
              <div>
                <b>Transfer {transfer.admission.patientName}</b>
                <small>
                  Current: {transfer.admission.wardName} · Bed{" "}
                  {transfer.admission.bedNumber}
                </small>
              </div>
              <div className="grid2">
                <label>
                  New ward
                  <select
                    required
                    value={transfer.wardId}
                    onChange={(event) =>
                      setTransfer({
                        ...transfer,
                        wardId: event.target.value,
                        bedId: "",
                      })
                    }
                  >
                    <option value="">Select ward</option>
                    {wards.map((ward) => (
                      <option key={ward._id} value={ward._id}>
                        {ward.name} · {ward.floor}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  New bed
                  <select
                    required
                    value={transfer.bedId}
                    onChange={(event) =>
                      setTransfer({ ...transfer, bedId: event.target.value })
                    }
                  >
                    <option value="">Select available bed</option>
                    {transferBeds.map((bed) => (
                      <option key={bed._id} value={bed._id}>
                        {bed.bedNumber} · {bed.bedType} · ₹{bed.dailyRate}/day
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button className="primary">Confirm transfer</button>
              <button
                type="button"
                className="textButton"
                onClick={() =>
                  setTransfer({ admission: null, wardId: "", bedId: "" })
                }
              >
                Cancel
              </button>
            </form>
          )}
          {admissions.map((item) => (
            <div className="admissionRow" key={item._id}>
              <div>
                <b>{item.patientName}</b>
                <small>
                  {item.admissionNumber} · {item.patientCode}
                </small>
                <span>
                  {item.wardName} · Bed {item.bedNumber} · {item.doctor}
                </span>
              </div>
              <div className="admissionActions">
                <button
                  type="button"
                  className="transferAction"
                  onClick={() =>
                    setTransfer({ admission: item, wardId: "", bedId: "" })
                  }
                >
                  Transfer bed
                </button>
                <button type="button" onClick={() => discharge(item._id)}>
                  Discharge
                </button>
              </div>
            </div>
          ))}
          {!admissions.length && (
            <p className="empty">No active IPD admissions.</p>
          )}
        </section>
      </div>
    </section>
  );
}
