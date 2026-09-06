import React from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('EduSphere Uncaught UI Exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 dark:bg-slate-950 font-sans">
          <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-6 sm:p-8 shadow-2xl dark:border-red-900/50 dark:bg-slate-900 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400 mb-4">
              <ShieldAlert className="h-8 w-8" />
            </div>

            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Tizimda Kutilmagan Xatolik
            </h1>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
              EduSphere Pro xavfsizlik va barqarorlik tizimi xatolikni ushlab qoldi. Barcha ma’lumotlaringiz xavfsiz saqlangan.
            </p>

            {this.state.error && (
              <div className="mt-4 rounded-xl bg-slate-100 p-3 text-left font-mono text-[11px] text-red-700 dark:bg-slate-800 dark:text-red-300 max-h-32 overflow-y-auto">
                {this.state.error.toString()}
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Sahifani Yangilash</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 transition-all active:scale-95"
              >
                <span>Qaytadan Urinish</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
