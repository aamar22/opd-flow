export function Field({
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
  required = false,
}) {
  return (
    <label>
      {label}
      {textarea ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
        />
      )}
    </label>
  );
}
export function Select({ label, value, onChange, options, required = false }) {
  return (
    <label>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      >
        {options.map((option) => {
          const [optionValue, optionLabel] = Array.isArray(option)
            ? option
            : [option, option];
          return (
            <option value={optionValue} key={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}
export function FormCard({
  title,
  subtitle,
  onSubmit,
  children,
  compact = false,
}) {
  return (
    <section className={`formPanel ${compact ? "compact" : ""}`}>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <form onSubmit={onSubmit}>{children}</form>
    </section>
  );
}
