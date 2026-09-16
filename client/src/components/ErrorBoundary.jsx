import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="mx-auto max-w-3xl p-8">
        <p className="mb-2 text-[13px] font-semibold text-rose">Render error</p>
        <pre className="overflow-x-auto rounded-lg bg-surface p-4 text-[12.5px] leading-relaxed text-slate ring-1 ring-line">
          {this.state.error.stack || String(this.state.error)}
        </pre>
      </div>
    )
  }
}
