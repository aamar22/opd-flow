import { useState } from "react";
import { patientApi } from "../../services/api";
import { Field, FormCard, Select } from "../../components/common/FormFields";
const initialForm = {
  name: "",
  age: "",
  gender: "Female",
  phone: "",
  address: "",
};
export default function PatientRegistrationPage({ onComplete }) {
  const [form, setForm] = useState(initialForm);
  const set = (name) => (value) => setForm({ ...form, [name]: value });
  const submit = async (event) => {
    event.preventDefault();
    await patientApi.create(form);
    setForm(initialForm);
    onComplete("Patient registered successfully.");
  };
  return (
    <FormCard
      title="New patient registration"
      subtitle="Create a unique OPD record for the patient"
      onSubmit={submit}
    >
      <Field
        label="Full name"
        value={form.name}
        onChange={set("name")}
        required
      />
      <div className="grid2">
        <Field
          label="Age"
          type="number"
          value={form.age}
          onChange={set("age")}
          required
        />
        <Select
          label="Gender"
          value={form.gender}
          onChange={set("gender")}
          options={["Female", "Male", "Other"]}
        />
      </div>
      <Field
        label="Phone number"
        value={form.phone}
        onChange={set("phone")}
        required
      />
      <Field label="Address" value={form.address} onChange={set("address")} />
      <button className="primary">Register patient →</button>
    </FormCard>
  );
}
