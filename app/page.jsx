"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function Home() {
	const [text, setText] = useState("");
	const [url, setUrl] = useState("");
	const [activeTab, setActiveTab] = useState("text");
	const [ingesting, setIngesting] = useState(false);
	const [ingestMsg, setIngestMsg] = useState(null);
	const [chunkCount, setChunkCount] = useState(0);

	const [messages, setMessages] = useState([]);
	const [chatInput, setChatInput] = useState("");
	const [chatLoading, setChatLoading] = useState(false);
	const messagesEndRef = useRef(null);
	const fileInputRef = useRef(null);

	const fetchCount = useCallback(async () => {
		try {
			const res = await fetch("/api/vectors");
			const data = await res.json();
			setChunkCount(data.count);
		} catch {
			setChunkCount(0);
		}
	}, []);

	useEffect(() => {
		fetchCount();
	}, [fetchCount]);
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	});

	async function handleIngestText() {
		if (!text.trim()) {
			setIngestMsg({ type: "error", text: "Please enter some text" });
			return;
		}
		setIngesting(true);
		setIngestMsg(null);
		try {
			const res = await fetch("/api/ingest", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text, source: "manual" }),
			});
			const data = await res.json();
			if (data.error) throw new Error(data.error);
			setIngestMsg({
				type: "success",
				text: `Added ${data.chunksInserted} chunks`,
			});
			setText("");
			fetchCount();
		} catch (err) {
			setIngestMsg({ type: "error", text: err.message });
		} finally {
			setIngesting(false);
		}
	}

	async function handleIngestFile(e) {
		const file = e.target.files?.[0];
		if (!file) return;
		setIngesting(true);
		setIngestMsg(null);
		try {
			const formData = new FormData();
			formData.append("file", file);
			const res = await fetch("/api/ingest/file", {
				method: "POST",
				body: formData,
			});
			const data = await res.json();
			if (data.error) throw new Error(data.error);
			setIngestMsg({
				type: "success",
				text: `Added ${data.chunksInserted} chunks from ${data.fileName}`,
			});
			fileInputRef.current.value = "";
			fetchCount();
		} catch (err) {
			setIngestMsg({ type: "error", text: err.message });
		} finally {
			setIngesting(false);
		}
	}

	async function handleIngestUrl() {
		if (!url.trim()) {
			setIngestMsg({ type: "error", text: "Please enter a URL" });
			return;
		}
		setIngesting(true);
		setIngestMsg(null);
		try {
			const res = await fetch("/api/ingest/url", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ url }),
			});
			const data = await res.json();
			if (data.error) throw new Error(data.error);
			setIngestMsg({
				type: "success",
				text: `Added ${data.chunksInserted} chunks from URL`,
			});
			setUrl("");
			fetchCount();
		} catch (err) {
			setIngestMsg({ type: "error", text: err.message });
		} finally {
			setIngesting(false);
		}
	}

	async function handleClear() {
		if (!confirm("Clear all data from the vector store?")) return;
		try {
			await fetch("/api/vectors", { method: "DELETE" });
			setIngestMsg({ type: "success", text: "All data cleared" });
			fetchCount();
		} catch (err) {
			setIngestMsg({ type: "error", text: err.message });
		}
	}

	async function handleChat(e) {
		e.preventDefault();
		if (!chatInput.trim() || chatLoading) return;
		const userMsg = chatInput.trim();
		setChatInput("");
		setMessages((prev) => [
			...prev,
			{ id: crypto.randomUUID(), role: "user", content: userMsg },
		]);
		setChatLoading(true);
		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: userMsg }),
			});
			const data = await res.json();
			if (data.error) throw new Error(data.error);
			setMessages((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					role: "assistant",
					content: data.response,
					chunks: data.chunks,
				},
			]);
		} catch (err) {
			setMessages((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					role: "assistant",
					content: `Error: ${err.message}`,
				},
			]);
		} finally {
			setChatLoading(false);
		}
	}

	const tabs = [
		{ id: "text", label: "Paste Text" },
		{ id: "file", label: "Upload File" },
		{ id: "url", label: "Scrape URL" },
	];

	return (
		<div className="max-w-6xl mx-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-screen">
			{/* Left: Ingestion Panel */}
			<div className="flex flex-col gap-4">
				<div className="flex justify-between items-center">
					<h2 className="text-xl font-bold">Knowledge Base</h2>
					<span className="text-sm text-zinc-500">
						{chunkCount} chunks stored
					</span>
				</div>

				<div className="flex gap-2">
					{tabs.map((tab) => (
						<button
							type="button"
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={`px-4 py-2 rounded-md border text-sm cursor-pointer transition-colors ${
								activeTab === tab.id
									? "bg-zinc-800 text-white border-zinc-600"
									: "bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>

				{activeTab === "text" && (
					<div className="flex flex-col gap-2">
						<textarea
							value={text}
							onChange={(e) => setText(e.target.value)}
							placeholder="Paste your text here..."
							rows={10}
							className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-200 resize-y text-sm focus:outline-none focus:border-zinc-600"
						/>
						<button
							type="button"
							onClick={handleIngestText}
							disabled={ingesting}
							className="px-5 py-2.5 bg-blue-900/50 text-blue-200 border border-blue-800 rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-900/70 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{ingesting ? "Processing..." : "Add Text"}
						</button>
					</div>
				)}

				{activeTab === "file" && (
					<div className="flex flex-col gap-2">
						<input
							ref={fileInputRef}
							type="file"
							accept=".txt,.md"
							onChange={handleIngestFile}
							disabled={ingesting}
							className="hidden"
						/>
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							disabled={ingesting}
							className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-700 rounded-lg p-10 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="32"
								height="32"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
								<polyline points="17 8 12 3 7 8" />
								<line x1="12" y1="3" x2="12" y2="15" />
							</svg>
							<span className="text-sm font-medium">
								{ingesting ? "Processing..." : "Click to upload .txt or .md"}
							</span>
							<span className="text-xs text-zinc-600">
								Supports plain text and markdown files
							</span>
						</button>
					</div>
				)}

				{activeTab === "url" && (
					<div className="flex flex-col gap-2">
						<input
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="https://example.com/article"
							className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-200 text-sm focus:outline-none focus:border-zinc-600"
						/>
						<button
							type="button"
							onClick={handleIngestUrl}
							disabled={ingesting}
							className="px-5 py-2.5 bg-blue-900/50 text-blue-200 border border-blue-800 rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-900/70 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{ingesting ? "Scraping..." : "Scrape URL"}
						</button>
					</div>
				)}

				{ingestMsg && (
					<div
						className={`p-3 rounded-lg text-sm border ${
							ingestMsg.type === "error"
								? "bg-red-950/50 border-red-900 text-red-300"
								: "bg-green-950/50 border-green-900 text-green-300"
						}`}
					>
						{ingestMsg.text}
					</div>
				)}

				<button
					type="button"
					onClick={handleClear}
					className="mt-auto px-5 py-2.5 bg-red-950/50 text-red-300 border border-red-900 rounded-lg text-sm font-medium cursor-pointer hover:bg-red-950/70"
				>
					Clear All Data
				</button>
			</div>

			{/* Right: Chat Panel */}
			<div className="flex flex-col border border-zinc-800 rounded-xl overflow-hidden">
				<div className="px-4 py-3 border-b border-zinc-800 font-semibold text-sm">
					Chat with your documents
				</div>

				<div className="flex-1 overflow-auto p-4 flex flex-col gap-3 min-h-[400px] max-h-[calc(100vh-160px)]">
					{messages.length === 0 && (
						<p className="text-zinc-600 text-center my-auto text-sm">
							Add some text to your knowledge base, then ask questions here.
						</p>
					)}
					{messages.map((msg) => (
						<div key={msg.id}>
							<div
								className={`px-3.5 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap max-w-[90%] ${
									msg.role === "user" ? "bg-blue-900/40 ml-auto" : "bg-zinc-900"
								}`}
							>
								{msg.content}
							</div>
							{msg.chunks && msg.chunks.length > 0 && (
								<details className="mt-1 ml-2 text-xs text-zinc-600">
									<summary className="cursor-pointer hover:text-zinc-400">
										Retrieved {msg.chunks.length} chunks
									</summary>
									<div className="flex flex-col gap-1.5 mt-1.5">
										{msg.chunks.map((chunk) => (
											<div
												key={`${chunk.source}-${chunk.score}`}
												className="p-2 bg-zinc-900 rounded-md border border-zinc-800"
											>
												<div className="text-zinc-500 mb-1">
													Score: {chunk.score.toFixed(3)} | Source:{" "}
													{chunk.source}
												</div>
												<div className="text-zinc-400">
													{chunk.text.slice(0, 200)}
													{chunk.text.length > 200 ? "..." : ""}
												</div>
											</div>
										))}
									</div>
								</details>
							)}
						</div>
					))}
					{chatLoading && (
						<div className="text-zinc-500 text-sm">Thinking...</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				<form
					onSubmit={handleChat}
					className="flex gap-2 p-3 border-t border-zinc-800"
				>
					<input
						value={chatInput}
						onChange={(e) => setChatInput(e.target.value)}
						placeholder="Ask a question..."
						className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-zinc-200 text-sm focus:outline-none focus:border-zinc-600"
					/>
					<button
						type="submit"
						disabled={chatLoading}
						className="px-5 py-2.5 bg-blue-900/50 text-blue-200 border border-blue-800 rounded-lg text-sm font-medium cursor-pointer hover:bg-blue-900/70 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Send
					</button>
				</form>
			</div>
		</div>
	);
}
