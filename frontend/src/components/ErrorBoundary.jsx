import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

// Catches a crash inside one page so the rest of the app keeps working
export default class ErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.error(error)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="text-center py-20">
        <AlertTriangle size={32} className="mx-auto mb-3 text-warn" />
        <p className="font-medium mb-1">This page ran into a problem</p>
        <p className="text-xs text-mu mb-4">
          Your data is safe. Reload the page to try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl text-sm bg-ac-bg text-ac"
        >
          Reload page
        </button>
      </div>
    )
  }
}