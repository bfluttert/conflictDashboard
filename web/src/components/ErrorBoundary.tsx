import React from 'react'

type Props = { children: React.ReactNode }

type State = { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught error', error, info)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16 }}>
          <div style={{ fontWeight: 600 }}>Something went wrong.</div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#991b1b' }}>{String(this.state.error)}</div>
        </div>
      )
    }
    return this.props.children
  }
}
