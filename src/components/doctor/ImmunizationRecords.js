import { useEffect, useRef, useState } from "react";
import { visitApi } from "../../services/api";

const empty = {
  vaccine: "",
  dose: "",
  dateGiven: "",
  batchNumber: "",
  provider: "",
  nextDueDate: "",
  notes: "",
};
const fields = [
  ["vaccine", "Vaccine name", "text", true],
  ["dose", "Dose / booster", "text", true],
  ["dateGiven", "Date given", "date", true],
  ["batchNumber", "Batch number", "text"],
  ["provider", "Administered by / clinic", "text"],
  ["nextDueDate", "Next due date", "date"],
];
const displayDate = (value) =>
  value
    ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString()
    : "—";

export default function ImmunizationRecords({ visit, patient, onSaved }) {
  const [draft, setDraft] = useState(empty);
  const [records, setRecords] = useState(visit.immunizations || []);
  const [previous, setPrevious] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const mounted = useRef(false);
  const savingRef = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHistoryError("");
    setPrevious([]);
    const references = [
      ...new Set(
        [visit.patientId, patient?._id, patient?.patientId].filter(Boolean),
      ),
    ];
    (async () => {
      const visits = new Map();
      for (const patientId of references) {
        let page = 1;
        let totalPages = 1;
        do {
          const { data } = await visitApi.getPage({
            patientId,
            page,
            limit: 100,
          });
          if (cancelled) return;
          data.items
            .filter(
              (item) =>
                String(item.patientId) === String(patientId) &&
                item._id !== visit._id,
            )
            .forEach((item) => visits.set(item._id, item));
          totalPages = data.totalPages || 1;
          page += 1;
        } while (page <= totalPages);
      }
      if (!cancelled)
        setPrevious(
          [...visits.values()].flatMap((item) =>
            (item.immunizations || []).map((record) => ({
              ...record,
              visitId: item._id,
            })),
          ),
        );
    })()
      .catch(() => {
        if (!cancelled)
          setHistoryError("Earlier immunization records could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visit._id, visit.patientId, patient?._id, patient?.patientId, retry]);

  const save = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;
    setError("");
    setMessage("");
    const entry = Object.fromEntries(
      Object.entries(draft).map(([key, value]) => [key, value.trim()]),
    );
    const today = new Date();
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (!entry.vaccine || !entry.dose || !entry.dateGiven) {
      setError("Enter the vaccine, dose and date given.");
      return;
    }
    if (entry.dateGiven > localToday) {
      setError("Date given cannot be in the future.");
      return;
    }
    if (entry.nextDueDate && entry.nextDueDate < entry.dateGiven) {
      setError("Next due date cannot be before the date given.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const { data } = await visitApi.update(visit._id, {
        immunizations: [...records, entry],
      });
      if (!mounted.current) return;
      const saved = data.immunizations || [...records, entry];
      setRecords(saved);
      setDraft(empty);
      setMessage("Immunization record saved.");
      onSaved(saved);
    } catch {
      if (mounted.current)
        setError(
          "Could not save the immunization. Your entry is still here; please retry.",
        );
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const all = [
    ...records.map((record) => ({ ...record, visitId: visit._id })),
    ...previous,
  ].sort((a, b) => String(b.dateGiven).localeCompare(String(a.dateGiven)));
  return (
    <section className="opdSection immunizationRecords">
      <h3>Immunization Records</h3>
      <p>
        Record vaccinations already given. Entries save immediately to this
        patient’s visit.
      </p>
      <form onSubmit={save} className="immunizationForm">
        <fieldset disabled={saving}>
          <legend>Add immunization</legend>
          <div className="immunizationGrid">
            {fields.map(([key, label, type, required]) => (
              <label key={key}>
                {label}
                {required ? " *" : ""}
                <input
                  type={type}
                  required={Boolean(required)}
                  value={draft[key]}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <label>
            Notes
            <textarea
              value={draft.notes}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>
          <button className="primary" type="submit">
            {saving ? "Saving..." : "Save immunization"}
          </button>
        </fieldset>
        {error && <p role="alert">{error}</p>}
        <p role="status">{message}</p>
      </form>
      <h3>Vaccination history</h3>
      {loading && <p role="status">Loading earlier immunizations...</p>}
      {historyError && (
        <p role="alert">
          {historyError}{" "}
          <button
            type="button"
            className="outlineButton"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry
          </button>
        </p>
      )}
      {all.length ? (
        <div className="immunizationTableWrap">
          <table>
            <thead>
              <tr>
                <th>Vaccine</th>
                <th>Dose</th>
                <th>Date given</th>
                <th>Next due</th>
                <th>Batch</th>
                <th>Provider</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {all.map((record, index) => (
                <tr key={`${record.visitId}-${record._id || index}`}>
                  <td>
                    <b>{record.vaccine}</b>
                    <small>
                      {record.visitId === visit._id
                        ? "This visit"
                        : "Earlier visit"}
                    </small>
                  </td>
                  <td>{record.dose}</td>
                  <td>{displayDate(record.dateGiven)}</td>
                  <td>{displayDate(record.nextDueDate)}</td>
                  <td>{record.batchNumber || "—"}</td>
                  <td>{record.provider || "—"}</td>
                  <td>{record.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading &&
        !historyError && (
          <div className="empty">No immunizations recorded yet.</div>
        )
      )}
    </section>
  );
}
