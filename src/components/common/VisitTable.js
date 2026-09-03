export default function VisitTable({ visits }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Patient</th>
          <th>Doctor / department</th>
          <th>Symptoms</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {visits.map((visit) => (
          <tr key={visit._id}>
            <td>
              <b>{visit.patientName}</b>
            </td>
            <td>
              {visit.doctor}
              <small>{visit.department}</small>
            </td>
            <td>{visit.symptoms || "—"}</td>
            <td>
              <span
                className={`badge ${visit.status === "Waiting" ? "waiting" : visit.status === "Dispensed" ? "success" : "complete"}`}
              >
                {visit.status}
              </span>
            </td>
          </tr>
        ))}
        {!visits.length && (
          <tr>
            <td colSpan="4" className="empty">
              No visits recorded yet.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
