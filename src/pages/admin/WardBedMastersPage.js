import { useEffect, useState } from "react";
import { ipdApi } from "../../services/api";
import hospitalBedImage from "../../assets/hospital-bed.png";
import maintenanceImage from "../../assets/technical-service.png";
import "../../styles/bed-status-icons.css";

const emptyWard = { name: "", floor: "", wardType: "General" };
const emptyBed = {
  wardId: "",
  bedNumber: "",
  bedType: "Standard",
  dailyRate: "",
};

export default function WardBedMastersPage({ onComplete, onNavigate }) {
  const [wards, setWards] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [wardForm, setWardForm] = useState(emptyWard);
  const [bedForm, setBedForm] = useState(emptyBed);
  const [editingWardId, setEditingWardId] = useState("");
  const [editingBedId, setEditingBedId] = useState("");
  const [openBedMenu, setOpenBedMenu] = useState("");
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
  const saveWard = async (event) => {
    event.preventDefault();
    if (editingWardId) await ipdApi.updateWard(editingWardId, wardForm);
    else await ipdApi.createWard(wardForm);
    onComplete(editingWardId ? "Ward updated." : "Ward created.");
    setEditingWardId("");
    setWardForm(emptyWard);
    load();
  };
  const saveBed = async (event) => {
    event.preventDefault();
    if (editingBedId)
      await ipdApi.updateBed(bedForm.wardId, editingBedId, bedForm);
    else await ipdApi.addBed(bedForm.wardId, bedForm);
    onComplete(editingBedId ? "Bed updated." : "Bed added to ward.");
    setEditingBedId("");
    setBedForm(emptyBed);
    load();
  };
  const editWard = (ward) => {
    setEditingWardId(ward._id);
    setWardForm({
      name: ward.name,
      floor: ward.floor,
      wardType: ward.wardType,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const editBed = (ward, bed) => {
    setEditingBedId(bed._id);
    setBedForm({
      wardId: ward._id,
      bedNumber: bed.bedNumber,
      bedType: bed.bedType,
      dailyRate: bed.dailyRate,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const removeWard = async (ward) => {
    if (!window.confirm(`Delete ward ${ward.name}?`)) return;
    await ipdApi.deleteWard(ward._id);
    load();
    onComplete("Ward deleted.");
  };
  const removeBed = async (ward, bed) => {
    if (!window.confirm(`Delete bed ${bed.bedNumber}?`)) return;
    await ipdApi.deleteBed(ward._id, bed._id);
    load();
    onComplete("Bed deleted.");
  };
  const startAdmission = (ward, bed) => {
    setOpenBedMenu("");
    onNavigate("IPD Admissions", {
      mode: "direct",
      wardId: ward._id,
      bedId: bed._id,
    });
  };
  const changeBedStatus = async (ward, bed, status) => {
    await ipdApi.updateBedStatus(ward._id, bed._id, status);
    setOpenBedMenu("");
    load();
    onComplete(
      status === "Maintenance"
        ? "Bed marked under repair."
        : "Bed marked available.",
    );
  };
  return (
    <section className="mastersWorkspace">
      <div className="masterGrid ipdMasterForms">
        <form className="masterCard" onSubmit={saveWard}>
          <h3>{editingWardId ? "Edit ward" : "Create ward"}</h3>
          <span className="masterHint">
            Configure the IPD ward before adding beds.
          </span>
          <label>
            Ward name
            <input
              required
              value={wardForm.name}
              onChange={(e) =>
                setWardForm({ ...wardForm, name: e.target.value })
              }
            />
          </label>
          <label>
            Floor
            <input
              required
              value={wardForm.floor}
              onChange={(e) =>
                setWardForm({ ...wardForm, floor: e.target.value })
              }
            />
          </label>
          <label>
            Ward type
            <select
              value={wardForm.wardType}
              onChange={(e) =>
                setWardForm({ ...wardForm, wardType: e.target.value })
              }
            >
              <option>General</option>
              <option>Private</option>
              <option>ICU</option>
              <option>Pediatric</option>
              <option>Maternity</option>
            </select>
          </label>
          <button className="primary">
            {editingWardId ? "Save ward" : "Create ward"}
          </button>
          {editingWardId && (
            <button
              type="button"
              className="textButton"
              onClick={() => {
                setEditingWardId("");
                setWardForm(emptyWard);
              }}
            >
              Cancel
            </button>
          )}
        </form>
        <form className="masterCard" onSubmit={saveBed}>
          <h3>{editingBedId ? "Edit bed" : "Create bed"}</h3>
          <span className="masterHint">
            Each bed number must be unique within its ward.
          </span>
          <label>
            Ward
            <select
              required
              disabled={!!editingBedId}
              value={bedForm.wardId}
              onChange={(e) =>
                setBedForm({ ...bedForm, wardId: e.target.value })
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
            Bed number
            <input
              required
              value={bedForm.bedNumber}
              onChange={(e) =>
                setBedForm({ ...bedForm, bedNumber: e.target.value })
              }
            />
          </label>
          <div className="grid2">
            <label>
              Bed type
              <select
                value={bedForm.bedType}
                onChange={(e) =>
                  setBedForm({ ...bedForm, bedType: e.target.value })
                }
              >
                <option>Standard</option>
                <option>Private</option>
                <option>ICU</option>
              </select>
            </label>
            <label>
              Daily rate (₹)
              <input
                type="number"
                min="0"
                required
                value={bedForm.dailyRate}
                onChange={(e) =>
                  setBedForm({ ...bedForm, dailyRate: e.target.value })
                }
              />
            </label>
          </div>
          <button className="primary">
            {editingBedId ? "Save bed" : "Add bed"}
          </button>
          {editingBedId && (
            <button
              type="button"
              className="textButton"
              onClick={() => {
                setEditingBedId("");
                setBedForm(emptyBed);
              }}
            >
              Cancel
            </button>
          )}
        </form>
      </div>
      {wards.map((ward) => (
        <section className="masterCard" key={ward._id}>
          <div className="wardHeading">
            <div>
              <h3>{ward.name}</h3>
              <span className="masterHint">
                {ward.wardType} · {ward.floor} · {ward.beds.length} beds
              </span>
            </div>
            <div>
              <button type="button" onClick={() => editWard(ward)}>
                Edit
              </button>
              <button
                type="button"
                className="deleteAction"
                disabled={ward.beds.some((bed) => bed.status === "Occupied")}
                onClick={() => removeWard(ward)}
              >
                Delete
              </button>
            </div>
          </div>
          <div className="bedGrid">
            {ward.beds.map((bed) => (
              <div
                className={`bedCard ${bed.status.toLowerCase()}`}
                key={bed._id}
                tabIndex={bed.status === "Occupied" ? 0 : undefined}
              >
                <div className="bedCardHead">
                  <b>Bed No {bed.bedNumber}</b>
                  <button
                    type="button"
                    className="bedMenuButton"
                    aria-label={`Actions for bed ${bed.bedNumber}`}
                    onClick={() =>
                      setOpenBedMenu(openBedMenu === bed._id ? "" : bed._id)
                    }
                  >
                    ⋮
                  </button>
                  {openBedMenu === bed._id && (
                    <div className="bedMenu">
                      {bed.status === "Available" && (
                        <button
                          type="button"
                          onClick={() => startAdmission(ward, bed)}
                        >
                          Admission
                        </button>
                      )}
                      {bed.status === "Available" && (
                        <button
                          type="button"
                          onClick={() =>
                            changeBedStatus(ward, bed, "Maintenance")
                          }
                        >
                          Under Repair
                        </button>
                      )}
                      {bed.status === "Maintenance" && (
                        <button
                          type="button"
                          onClick={() =>
                            changeBedStatus(ward, bed, "Available")
                          }
                        >
                          Mark Available
                        </button>
                      )}
                      {bed.status === "Occupied" && (
                        <span>Patient admitted</span>
                      )}
                    </div>
                  )}
                </div>
                {["Available", "Occupied", "Maintenance"].includes(
                  bed.status,
                ) && (
                  <div className="bedStatusVisual" aria-hidden="true">
                    <img
                      src={
                        bed.status === "Maintenance"
                          ? maintenanceImage
                          : hospitalBedImage
                      }
                      alt=""
                    />
                  </div>
                )}
                <span>
                  {bed.bedType} · ₹{bed.dailyRate}/day
                </span>
                <small>{bed.status}</small>
                {bed.status === "Occupied" &&
                  (() => {
                    const admission = admissions.find(
                      (item) => String(item.bedId) === String(bed._id),
                    );
                    return (
                      <div className="bedPatientPopover" role="tooltip">
                        {admission ? (
                          <>
                            <b>{admission.patientName}</b>
                            <span>UHID: {admission.patientCode || "—"}</span>
                            <span>Admission: {admission.admissionNumber}</span>
                            <span>Doctor: {admission.doctor}</span>
                            <span>
                              Diagnosis: {admission.diagnosis || "Not recorded"}
                            </span>
                            <span>
                              Admitted:{" "}
                              {new Date(admission.admittedAt).toLocaleString()}
                            </span>
                          </>
                        ) : (
                          <span>Patient details are unavailable.</span>
                        )}
                      </div>
                    );
                  })()}
                <div className="bedActions">
                  <button type="button" onClick={() => editBed(ward, bed)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={bed.status === "Occupied"}
                    onClick={() => removeBed(ward, bed)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!ward.beds.length && <p className="empty">No beds created.</p>}
          </div>
        </section>
      ))}
    </section>
  );
}
