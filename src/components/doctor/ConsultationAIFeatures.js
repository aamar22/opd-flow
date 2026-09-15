import { useEffect, useRef, useState } from "react";

export default function ConsultationAIFeatures({ onAddNotes }) {
  const input = useRef(null);
  const task = useRef(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [text, setText] = useState("");
  useEffect(
    () => () => {
      if (task.current) {
        task.current.cancelled = true;
        task.current.worker?.terminate().catch(() => {});
        task.current.worker = null;
      }
    },
    [],
  );

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;
    setError("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Choose a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose an image smaller than 10 MB.");
      return;
    }
    const job = { cancelled: false, worker: null };
    task.current = job;
    setBusy(true);
    setText("");
    setFilename(file.name);
    setStatus("Preparing OCR...");
    try {
      const { createWorker } = await import("tesseract.js");
      if (job.cancelled) return;
      const worker = await createWorker("eng", 1, {
        logger: (message) => {
          if (!job.cancelled && message.status === "recognizing text") {
            setStatus(
              `Extracting text... ${Math.round(message.progress * 100)}%`,
            );
          }
        },
      });
      job.worker = worker;
      if (job.cancelled) return;
      const result = await worker.recognize(file);
      if (job.cancelled) return;
      const extracted = result.data.text.trim();
      setText(extracted);
      setStatus(extracted ? "Text extracted. Review and edit it below." : "");
      if (!extracted) setError("No text found. Try a clearer image.");
    } catch {
      if (!job.cancelled) {
        setStatus("");
        setError(
          "Could not extract text. Check your connection and try a clearer image.",
        );
      }
    } finally {
      const worker = job.worker;
      job.worker = null;
      if (worker) await worker.terminate().catch(() => {});
      if (!job.cancelled) setBusy(false);
    }
  };

  return (
    <section className="opdSection consultationAI">
      <h3>AI Features</h3>
      <div className="consultationOCR">
        <h4>OCR AI</h4>
        <p>Upload a report or prescription image to extract English text.</p>
        <p>
          PNG, JPG, or WebP, up to 10 MB. Review extracted text before adding it
          to clinical notes.
        </p>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Upload image for OCR"
          hidden
          disabled={busy}
          onChange={upload}
        />
        <button
          className="primary"
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? "Processing image..." : "OCR AI - Upload image"}
        </button>
        {filename && <p className="ocrFilename">{filename}</p>}
        <p role="status">{status}</p>
        {error && (
          <p role="alert" className="ocrError">
            {error}
          </p>
        )}
        {!busy && filename && (
          <label className="ocrText">
            Extracted text
            <textarea
              rows={10}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </label>
        )}
        {text && !busy && (
          <button
            className="outlineButton"
            type="button"
            disabled={!text.trim()}
            onClick={() => {
              onAddNotes(text.trim());
              setText("");
              setStatus("Text added to clinical notes.");
            }}
          >
            Add to clinical notes
          </button>
        )}
      </div>
    </section>
  );
}
