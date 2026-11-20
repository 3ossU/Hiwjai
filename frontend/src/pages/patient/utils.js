export const fmtDateTime = (v) => {
  if (!v) return '-'
  const d = new Date(String(v).replace(' ', 'T'))
  return isNaN(d)
    ? String(v)
    : d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })
}

export const fmtDate = (v) => {
  if (!v) return '-'
  const d = new Date(String(v).replace(' ', 'T'))
  return isNaN(d) ? String(v) : d.toLocaleDateString('th-TH', { dateStyle: 'medium' })
}