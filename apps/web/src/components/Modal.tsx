import { useEffect, useRef, type ReactNode } from 'react';

/** Modal con <dialog> nativo: cierra con Escape o clic afuera. */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="btn ghost sm" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </div>
      {open && children}
    </dialog>
  );
}
