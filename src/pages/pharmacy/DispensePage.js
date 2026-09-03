import { useEffect, useState } from "react";
import { medicineApi, patientApi, visitApi } from "../../services/api";
import Pagination from "../../components/common/Pagination";

const PAGE_SIZE = 25;
export default function DispensePage({ onComplete }) {
  const [active, setActive] = useState(null);
  const [ready, setReady] = useState([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [patient, setPatient] = useState(null);
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = patientSearch.trim();
      if (!search || patient) return setPatientResults([]);
      patientApi
        .getPage({ page: 1, limit: 8, search })
        .then(({ data }) => setPatientResults(data.items));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [patientSearch, patient]);

  useEffect(() => {
    visitApi
      .getPage({
        page,
        limit: PAGE_SIZE,
        status: "Completed",
        patientId: patient?._id,
      })
      .then(({ data }) => {
        setReady(data.items.filter((visit) => visit.medicines?.length));
        setTotalItems(data.totalItems);
      });
  }, [page, reloadKey, patient]);

  const choosePatient = (item) => {
    setPatient(item);
    setPatientSearch(`${item.name} · ${item.patientId}`);
    setPatientResults([]);
    setPage(1);
    setActive(null);
  };
  const choosePrescription = (visit) => {
    setActive(visit);
    setQuantities(
      Object.fromEntries(
        visit.medicines.map((medicine, index) => [
          index,
          Number(medicine.days || 1),
        ]),
      ),
    );
  };
  const dispense = async () => {
    await medicineApi.dispense(
      active.medicines.map((medicine, index) => ({
        name: medicine.name,
        quantity: Number(quantities[index] || 1),
      })),
    );
    await visitApi.update(active._id, { status: "Dispensed" });
    setActive(null);
    setReloadKey((value) => value + 1);
    onComplete("Prescription dispensed from the earliest-expiring batches.");
  };

  return (
    <>
      <section className="panel">
        <div className="panelHead">
          <div>
            <h2>Find patient</h2>
            <p>Search by patient name, UHID, or mobile number</p>
          </div>
        </div>
        <label className="billingSearch">
          Patient search
          <input
            value={patientSearch}
            placeholder="Name, UHID, or mobile…"
            onChange={(event) => {
              setPatientSearch(event.target.value);
              setPatient(null);
            }}
          />
        </label>
        {!!patientResults.length && (
          <div className="patientResults">
            {patientResults.map((item) => (
              <button
                type="button"
                key={item._id}
                onClick={() => choosePatient(item)}
              >
                <b>{item.name}</b>
                <span>
                  {item.patientId} · {item.phone}
                </span>
              </button>
            ))}
          </div>
        )}
        {patient && (
          <p className="billingPatient">
            <b>{patient.name}</b> · {patient.patientId} · {patient.phone} ·{" "}
            {patient.age || "—"} years / {patient.gender || "—"}
            <br />
            {patient.address || "No address recorded"}
          </p>
        )}
      </section>

      <div className="consult">
        <section className="panel queue">
          <div className="panelHead">
            <div>
              <h2>Ready prescriptions</h2>
              <p>
                {patient
                  ? `Prescriptions for ${patient.name}`
                  : "Awaiting pharmacy issue"}
              </p>
            </div>
          </div>
          {ready.map((visit) => (
            <button
              className={`queueRow ${active?._id === visit._id ? "chosen" : ""}`}
              onClick={() => choosePrescription(visit)}
              key={visit._id}
            >
              <div className="avatar purple">{visit.patientName?.[0]}</div>
              <div>
                <b>{visit.patientName}</b>
                <small>{visit.diagnosis || "Prescription from doctor"}</small>
              </div>
              <span className="badge success">Ready</span>
            </button>
          ))}
          {!ready.length && (
            <div className="empty">No prescriptions ready to dispense.</div>
          )}
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={totalItems}
            onPageChange={setPage}
          />
        </section>
        <section className="panel consultForm">
          {active ? (
            <>
              <div className="panelHead">
                <div>
                  <h2>{active.patientName}</h2>
                  <p>Confirm quantity for each prescribed medicine</p>
                </div>
              </div>
              <div className="rx">
                {active.medicines.map((medicine, index) => (
                  <div key={index}>
                    <b>{medicine.name}</b>
                    <span>
                      {medicine.dosage} · {medicine.days} days
                    </span>
                    <label>
                      Issue quantity
                      <input
                        type="number"
                        min="1"
                        value={quantities[index] || 1}
                        onChange={(event) =>
                          setQuantities({
                            ...quantities,
                            [index]: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
              <button className="primary" onClick={dispense}>
                Confirm dispense →
              </button>
            </>
          ) : (
            <div className="empty">
              Select a prescription to review and dispense.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
