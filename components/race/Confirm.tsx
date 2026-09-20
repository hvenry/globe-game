"use client";

/**
 * A two-step decision inside a panel: the question, its consequence, the
 * safe answer with the emphasis, and the other one in the quiet style solo
 * gives "Quit game". The race menu, the waiting room and the left-race
 * view all ask with this so leaving looks the same everywhere.
 */
export default function Confirm({
  question,
  consequence,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  question: string;
  consequence: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-7 space-y-2 md:space-y-2.5">
      <p className="text-center text-sm text-hi">{question}</p>
      <p className="text-center text-label text-faint">{consequence}</p>
      <button onClick={onCancel} className="btn-primary btn-signal press mt-1">
        {cancelLabel}
      </button>
      <button onClick={onConfirm} className="btn-quiet press">
        {confirmLabel}
      </button>
    </div>
  );
}
