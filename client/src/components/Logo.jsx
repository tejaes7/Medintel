export default function Logo({ className = '', mark = false }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="grid size-7 place-items-center rounded-[7px] bg-ink">
        <svg viewBox="0 0 24 24" className="size-4 text-white" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h3.5l2 5.5 3.5-11 2.5 7 1.5-2.5H21" />
        </svg>
      </span>
      {!mark && <span className="text-[17px] font-semibold tracking-[-0.02em] text-ink">MedIntel</span>}
    </span>
  )
}
