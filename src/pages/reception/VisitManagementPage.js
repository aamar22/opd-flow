import { useEffect, useState } from "react";
import Pagination from "../../components/common/Pagination";
import { visitApi } from "../../services/api";

const VISITS_PER_PAGE = 25;
const formatDate = (date) =>
  date
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(date))
    : "—";
const statusClass = (status) =>
  status === "Waiting"
    ? "waiting"
    : status === "Dispensed"
      ? "success"
      : "complete";
const printPrescription = (visit) => {
  const win = window.open("", "_blank");
  if (!win) return;
  const medicines = visit.medicines?.length
    ? visit.medicines
        .map(
          (item) =>
            `<li><b>${item.name}</b><span>${item.dosage || ""} · ${item.days || 1} day(s)</span></li>`,
        )
        .join("")
    : "<li>No medication prescribed.</li>";
  win.document.write(
    `<!doctype html><html><head><title>Prescription</title><style>body{font:14px Arial;color:#172b3a;margin:35px}header{border-bottom:2px solid #149f97;padding-bottom:15px}h1{margin:0}h2{font-size:16px;margin-top:28px}.grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #dbe3e8}.grid div{padding:11px;border-bottom:1px solid #dbe3e8}.label{display:block;color:#748391;font-size:11px}ul{padding:0;list-style:none;border:1px solid #dbe3e8}li{display:flex;justify-content:space-between;padding:12px;border-bottom:1px solid #dbe3e8}</style></head><body><header><h1>OPD Prescription</h1><p>${visit.patientName} · ${visit.patientId}</p></header><h2>Consultation</h2><section class="grid"><div><span class="label">Doctor</span>${visit.doctor}</div><div><span class="label">Date</span>${formatDate(visit.createdAt)}</div><div><span class="label">Diagnosis</span>${visit.diagnosis || "Not recorded"}</div><div><span class="label">Chief complaint</span>${visit.chiefComplaint || visit.symptoms}</div></section><h2>Medication</h2><ul>${medicines}</ul><script>window.onload=()=>window.print()<\/script></body></html>`,
  );
  win.document.close();
};

export default function VisitManagementPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [visitPage, setVisitPage] = useState(1);
  const [visits, setVisits] = useState([]);
  const [totalVisits, setTotalVisits] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    visitApi
      .getPage({
        page: visitPage,
        limit: VISITS_PER_PAGE,
        search: debouncedQuery || undefined,
        status: status === "All" ? undefined : status,
      })
      .then(({ data }) => {
        if (!cancelled) {
          setVisits(data.items);
          setTotalVisits(data.totalItems);
        }
      })
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, status, visitPage]);
  return (
    <section className="visitWorkspace">
      <div className="visitTopbar">
        <div>
          <p className="eyebrow">OPD WORKLIST</p>
          <h2>Patient visits</h2>
          <span>Appointments are automatically added to this visit list.</span>
        </div>
      </div>
      <div className="visitFilters">
        <div className="statusTabs" role="tablist">
          {["All", "Waiting", "Completed", "Dispensed"].map((label) => (
            <button
              className={`statusTab ${status === label ? "selected" : ""}`}
              onClick={() => {
                setStatus(label);
                setVisitPage(1);
              }}
              key={label}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="visitSearch">
          <span>⌕</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisitPage(1);
            }}
            placeholder="Search patient, OPD ID, doctor…"
          />
        </label>
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
                onClick={() => setSelectedVisit(visit)}
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
                    {String(
                      (visitPage - 1) * VISITS_PER_PAGE + index + 1,
                    ).padStart(4, "0")}
                  </b>
                  <small>{formatDate(visit.createdAt)}</small>
                </td>
                <td>
                  <b>{visit.doctor}</b>
                  <small>{visit.department}</small>
                </td>
                <td className="reasonCell">
                  {visit.chiefComplaint || visit.symptoms}
                </td>
                <td>
                  <span className={`badge ${statusClass(visit.status)}`}>
                    {visit.status}
                  </span>
                </td>
                <td>
                  <button
                    className="openVisit"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedVisit(visit);
                    }}
                  >
                    Open →
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && !visits.length && (
              <tr>
                <td colSpan="6" className="empty">
                  No patient visits match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={visitPage}
        pageSize={VISITS_PER_PAGE}
        totalItems={totalVisits}
        onPageChange={setVisitPage}
      />
      {selectedVisit && (
        <section className="visitFullScreen">
          <header className="visitFullTopbar">
            <div>
              <h2>{selectedVisit.patientName}</h2>
              <p>
                {selectedVisit.patientId} · {selectedVisit.department}
              </p>
            </div>
            <div className="visitFullActions">
              <button
                className="visitBack"
                onClick={() => setSelectedVisit(null)}
              >
                ← Back to visits
              </button>
              <button
                className="primary"
                onClick={() => printPrescription(selectedVisit)}
              >
                Generate prescription
              </button>
            </div>
          </header>
          <main className="visitFullBody">
            <div className="visitFullGrid">
              <section className="visitFullCard">
                <h3>Visit summary</h3>
                <dl>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <span
                        className={`badge ${statusClass(selectedVisit.status)}`}
                      >
                        {selectedVisit.status}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Visit date</dt>
                    <dd>{formatDate(selectedVisit.createdAt)}</dd>
                  </div>
                  <div>
                    <dt>Consulting doctor</dt>
                    <dd>{selectedVisit.doctor}</dd>
                  </div>
                  <div>
                    <dt>Department</dt>
                    <dd>{selectedVisit.department}</dd>
                  </div>
                  <div>
                    <dt>Chief complaint</dt>
                    <dd>
                      {selectedVisit.chiefComplaint || selectedVisit.symptoms}
                    </dd>
                  </div>
                  <div>
                    <dt>Diagnosis</dt>
                    <dd>{selectedVisit.diagnosis || "Not recorded"}</dd>
                  </div>
                </dl>
              </section>
              <section className="visitFullCard">
                <h3>Vitals and allergies</h3>
                <dl>
                  <div>
                    <dt>Temperature</dt>
                    <dd>{selectedVisit.vitals?.temperature || "—"}</dd>
                  </div>
                  <div>
                    <dt>Pulse</dt>
                    <dd>{selectedVisit.vitals?.pulse || "—"}</dd>
                  </div>
                  <div>
                    <dt>Blood pressure</dt>
                    <dd>
                      {selectedVisit.vitals?.systolic
                        ? `${selectedVisit.vitals.systolic}/${selectedVisit.vitals.diastolic || "—"}`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>SpO₂</dt>
                    <dd>{selectedVisit.vitals?.spo2 || "—"}</dd>
                  </div>
                  <div>
                    <dt>Weight</dt>
                    <dd>{selectedVisit.vitals?.weight || "—"}</dd>
                  </div>
                  <div>
                    <dt>Allergies</dt>
                    <dd>
                      {selectedVisit.allergies?.join(", ") || "None recorded"}
                    </dd>
                  </div>
                </dl>
              </section>
              <section className="visitFullCard wide">
                <h3>Medication</h3>
                <ul className="prescriptionList">
                  {selectedVisit.medicines?.length ? (
                    selectedVisit.medicines.map((medicine, index) => (
                      <li key={index}>
                        <b>{medicine.name}</b>
                        <small>
                          {medicine.dosage || "No dosage"} ·{" "}
                          {medicine.days || 1} day(s)
                        </small>
                      </li>
                    ))
                  ) : (
                    <li>No medication prescribed.</li>
                  )}
                </ul>
              </section>
              <section className="visitFullCard wide">
                <h3>Clinical notes</h3>
                <p>{selectedVisit.notes || "No clinical notes recorded."}</p>
              </section>
            </div>
          </main>
        </section>
      )}
    </section>
  );
}
