const prefix = 'cui'

export const Select = <V extends string>({
  label,
  onChange,
  options,
  value,
  name,
}: {
  label?: string,
  value: V,
  name?: string,
  options: [value: V, label?: string][],
  onChange: (value: V) => void,
 }) => {
  return <label style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'space-between', gap: '0.5em' }}>
    {label && <strong style={{ display: 'block' }}>{label}:</strong>}
    <select name={name} value={value} onChange={(event) => {
      const value: V = event.target.value as V
      onChange(value)
    }} style={{ backgroundColor: 'var(--cui-control-background-color)', borderRadius: '0.25em', color: 'var(--cui-color--strong)', padding: '0.25em 0.33em' }}>
      {options.map(([option, label]) => <option value={option}>{label ?? option}</option>)}
    </select>
  </label>
}
