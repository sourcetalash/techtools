import React from 'react'

type Props = { children: React.ReactNode }
type State = { hasError: boolean, error?: any }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error }
  }
  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <h1 className="text-xl font-semibold">Something went wrong.</h1>
          <p className="opacity-80">Reload the page or check the console for details.</p>
        </div>
      )
    }
    return this.props.children
  }
}

