import React from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-8">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Une erreur est survenue</h2>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message || 'Erreur inattendue'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleReset}>Réessayer</Button>
              <Button variant="outline" onClick={() => window.location.href = '/'}>
                Accueil
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
