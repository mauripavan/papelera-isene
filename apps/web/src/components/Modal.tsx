import { useEffect, useRef, type ReactNode } from 'react';

/** Modal con <dialog> nativo: cierra con Escape o clic afuera. */
export function Modal({
  open,
  onClose,
  title,
  wide = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: ReactNode;
}) {
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
      className={wide ? 'modal wide' : 'modal'}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button type="button" className="btn ghost sm" onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
      </div>
      {open && children}
    </dialog>
  );
}
