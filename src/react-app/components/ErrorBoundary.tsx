import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
	children: ReactNode;
}

interface ErrorBoundaryState {
	error: Error | null;
}

// Top-level boundary so a render error shows a recovery screen instead of a
// blank page. Kept dependency-free (no i18n context) so it works even if the
// failure happened above the providers; the message is bilingual.
export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	state: ErrorBoundaryState = { error: null };

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("Unhandled UI error:", error, info);
	}

	private handleReload = () => {
		this.setState({ error: null });
		window.location.reload();
	};

	render() {
		if (!this.state.error) return this.props.children;

		return (
			<div className="min-h-dvh flex items-center justify-center p-6 bg-pw-50">
				<div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-pw-300/20 p-8 text-center space-y-4 border border-pw-100">
					<h1 className="text-lg font-bold text-slate-800">
						出错了 / Something went wrong
					</h1>
					<p className="text-sm text-slate-500">
						应用遇到了一个意外错误。你的数据仍保存在浏览器缓存或已下载的文件中。
						<br />
						The app hit an unexpected error. Your data is still in the browser
						cache or your downloaded file.
					</p>
					<button
						onClick={this.handleReload}
						className="px-4 py-2 rounded-xl bg-pw-500 text-white text-sm font-medium hover:bg-pw-600 transition-colors"
					>
						重新加载 / Reload
					</button>
				</div>
			</div>
		);
	}
}
