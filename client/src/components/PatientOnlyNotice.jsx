import Icon from './Icon'
import { Card, Button } from './ui'

export default function PatientOnlyNotice({ featureName = 'This feature' }) {
  return (
    <div className="mx-auto max-w-xl py-12">
      <Card className="border border-line p-8 text-center shadow-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
          <Icon name="shield" className="size-6" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-ink">Patient Personal Health Record</h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-slate">
          {featureName} is designed for individual patients managing their personal symptom intake, medical lab records, and medication schedules.
        </p>
        <div className="mt-3 rounded-lg bg-surface p-3 text-[12.5px] text-muted ring-1 ring-line">
          You are currently signed in with a verified <strong className="font-semibold text-brand">Hospital Administrator</strong> account.
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button as="link" to="/app">
            Hospital Operations Desk
          </Button>
          <Button as="link" to="/app/hospitals?tab=appointments" variant="secondary">
            Appointments Queue
          </Button>
        </div>
      </Card>
    </div>
  )
}
