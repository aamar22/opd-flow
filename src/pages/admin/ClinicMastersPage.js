import { useEffect, useState } from "react";
import { clinicSettingsApi } from "../../services/api";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const emptyDoctor = { name: "", department: "", availability: [] };

export default function ClinicMastersPage({ onComplete, onSettingsChange }) {
  const [settings, setSettings] = useState({
    clinicName: "",
    logoUrl: "",
    address: "",
    phone: "",
    email: "",
    doctors: [],
  });
  const [doctor, setDoctor] = useState(emptyDoctor);
  const [days, setDays] = useState([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ]);
  const [hours, setHours] = useState({ start: "09:00", end: "17:00" });

  useEffect(() => {
    clinicSettingsApi.get().then(({ data }) => setSettings(data));
  }, []);
  const update = (field, value) =>
    setSettings((current) => ({ ...current, [field]: value }));
  const addDoctor = () => {
    if (!doctor.name.trim() || !doctor.department.trim() || !days.length)
      return;
    setSettings((current) => ({
      ...current,
      doctors: [
        ...current.doctors,
        {
          ...doctor,
          id: `doctor-${Date.now()}`,
          availability: days.map((day) => ({ day, ...hours })),
        },
      ],
    }));
    setDoctor(emptyDoctor);
    setDays(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  };
  const save = async () => {
    const { data } = await clinicSettingsApi.update(settings);
    setSettings(data);
    onSettingsChange(data);
    onComplete(
      "Clinic masters saved. Appointment schedules and PDFs now use these details.",
    );
  };
  const uploadLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("logoUrl", reader.result);
    reader.readAsDataURL(file);
  };
  return (
    <section className="mastersWorkspace">
      <div className="appointmentHeader">
        <div>
          <h2>Clinic Masters</h2>
          <p>Manage clinic branding, doctors and appointment availability</p>
        </div>
        <button className="appointmentPrimary" onClick={save}>
          Save masters
        </button>
      </div>
      <section className="masterCard">
        <h3>Clinic profile</h3>
        <div className="masterGrid">
          <label>
            Clinic name <em>*</em>
            <input
              value={settings.clinicName}
              onChange={(event) => update("clinicName", event.target.value)}
              required
            />
          </label>
          <label>
            Clinic logo{" "}
            <input type="file" accept="image/*" onChange={uploadLogo} />
          </label>
          <label>
            Address
            <input
              value={settings.address}
              onChange={(event) => update("address", event.target.value)}
              placeholder="Clinic address"
            />
          </label>
          <label>
            Phone
            <input
              value={settings.phone}
              onChange={(event) => update("phone", event.target.value)}
              placeholder="Contact number"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={settings.email}
              onChange={(event) => update("email", event.target.value)}
              placeholder="Email address"
            />
          </label>
        </div>
        {settings.logoUrl && (
          <div className="logoPreview">
            <img src={settings.logoUrl} alt="Clinic logo preview" />
            <button type="button" onClick={() => update("logoUrl", "")}>
              Remove logo
            </button>
          </div>
        )}
        <small className="masterHint">
          The clinic name and logo are shown on appointment PDFs.
        </small>
      </section>
      <section className="masterCard">
        <h3>Doctors & availability</h3>
        <p className="masterHint">
          Each available slot is 15 minutes. Reception can book only open slots.
        </p>
        <div className="doctorList">
          {settings.doctors.map((item) => (
            <div className="doctorRow" key={item.id}>
              <div>
                <b>{item.name}</b>
                <small>{item.department}</small>
                <span>
                  {item.availability
                    .map(
                      (availability) =>
                        `${availability.day.slice(0, 3)} ${availability.start}–${availability.end}`,
                    )
                    .join(" · ") || "No availability"}
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  update(
                    "doctors",
                    settings.doctors.filter(
                      (doctorItem) => doctorItem.id !== item.id,
                    ),
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="addDoctor">
          <h4>Add doctor</h4>
          <div className="masterGrid">
            <label>
              Doctor name{" "}
              <input
                value={doctor.name}
                onChange={(event) =>
                  setDoctor({ ...doctor, name: event.target.value })
                }
                placeholder="Dr. Name"
              />
            </label>
            <label>
              Department{" "}
              <input
                value={doctor.department}
                onChange={(event) =>
                  setDoctor({ ...doctor, department: event.target.value })
                }
                placeholder="Specialty"
              />
            </label>
          </div>
          <div className="availabilityDays">
            {DAYS.map((day) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={days.includes(day)}
                  onChange={() =>
                    setDays(
                      days.includes(day)
                        ? days.filter((item) => item !== day)
                        : [...days, day],
                    )
                  }
                />
                {day.slice(0, 3)}
              </label>
            ))}
          </div>
          <div className="masterHours">
            <label>
              From{" "}
              <input
                type="time"
                value={hours.start}
                onChange={(event) =>
                  setHours({ ...hours, start: event.target.value })
                }
              />
            </label>
            <label>
              To{" "}
              <input
                type="time"
                value={hours.end}
                onChange={(event) =>
                  setHours({ ...hours, end: event.target.value })
                }
              />
            </label>
            <button type="button" className="primary" onClick={addDoctor}>
              Add doctor
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}
