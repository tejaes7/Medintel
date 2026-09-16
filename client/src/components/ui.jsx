import { Link } from 'react-router-dom'

export function Button({ as = 'button', variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap'
  const sizes = {
    sm: 'h-8 px-3 text-[13px]',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-5 text-[15px]',
  }
  const variants = {
    primary: 'bg-brand text-white shadow-[0_1px_2px_rgba(10,37,64,.16)] hover:bg-brand-dark hover:-translate-y-px active:translate-y-0',
    dark: 'bg-ink text-white hover:bg-[#123456] hover:-translate-y-px',
    secondary: 'bg-white text-ink ring-1 ring-line hover:ring-[#cfd8e3] shadow-[0_1px_2px_rgba(10,37,64,.06)]',
    ghost: 'text-slate hover:text-ink hover:bg-surface',
    soft: 'bg-brand-soft text-brand hover:bg-[#e6e4ff]',
  }
  const Cmp = as === 'link' ? Link : as
  return <Cmp className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />
}

export function Card({ className = '', children, ...props }) {
  return (
    <div className={`rounded-xl bg-white ring-1 ring-line shadow-card ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardHead({ title, sub, action }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

const tones = {
  brand: 'bg-brand-soft text-brand',
  teal: 'bg-teal-soft text-teal',
  amber: 'bg-amber-soft text-amber',
  rose: 'bg-rose-soft text-rose',
  slate: 'bg-surface text-slate',
}

export function Badge({ tone = 'slate', className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11.5px] font-semibold tracking-wide ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

export function Dot({ tone = 'slate' }) {
  const c = { brand: 'bg-brand', teal: 'bg-teal', amber: 'bg-amber', rose: 'bg-rose', slate: 'bg-muted' }[tone]
  return <span className={`size-1.5 rounded-full ${c}`} />
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-slate">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-muted">{hint}</span>}
    </label>
  )
}

export const inputCls =
  'w-full rounded-lg bg-white px-3 py-2.5 text-sm text-ink ring-1 ring-line shadow-[0_1px_2px_rgba(10,37,64,.05)] placeholder:text-muted transition focus:outline-none focus:ring-2 focus:ring-brand'

export function PageHead({ eyebrow, title, sub, children }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
        )}
        <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-slate">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

export function Empty({ title, sub, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 size-9 rounded-lg bg-surface ring-1 ring-line" />
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-muted">{sub}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
