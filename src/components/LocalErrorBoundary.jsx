import React from "react";

export default class LocalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
     
    console.error('[LocalErrorBoundary] caught', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-200 bg-red-50 rounded text-red-700 text-sm">
          <div className="font-semibold">Something went wrong rendering this section.</div>
          {this.state.error?.message && (
            <div className="mt-1 text-xs text-red-600">{String(this.state.error.message)}</div>
          )}
          <button
            className="mt-2 inline-flex items-center px-3 py-1.5 rounded bg-red-600 text-white text-xs hover:bg-red-700"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}