"use client";

import { useEffect, useRef } from "react";
import { lockScroll, prefersReducedMotion, unlockScroll } from "@/lib/scroll";
import styles from "./ModalDialog.module.css";

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name announced when the dialog opens. */
  label: string;
  variant: "drawer" | "modal";
  /** Called once the exit transition has finished and the dialog is fully closed. */
  onExited?: () => void;
  children: React.ReactNode;
}

const EXIT_MS = 320;

/**
 * Accessible modal built on the native <dialog>: the browser traps focus, makes the
 * rest of the page inert, closes on Escape and restores focus to the opener.
 * We only add the enter/exit transition, backdrop-click close and scroll locking.
 */
export function ModalDialog({ open, onClose, label, variant, onExited, children }: ModalDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const locked = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const exited = useRef(onExited);
  useEffect(() => {
    exited.current = onExited;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) {
      window.clearTimeout(timer.current);
      if (!dialog.open) dialog.showModal();
      if (!locked.current) {
        lockScroll();
        locked.current = true;
      }
      // Two frames so the closed → open transition is actually painted.
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => dialog.setAttribute("data-state", "open"));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }

    if (dialog.open) {
      dialog.setAttribute("data-state", "closing");
      const finish = () => {
        if (dialog.open) dialog.close();
        dialog.removeAttribute("data-state");
        if (locked.current) {
          unlockScroll();
          locked.current = false;
        }
        exited.current?.();
      };
      if (prefersReducedMotion()) finish();
      else timer.current = window.setTimeout(finish, EXIT_MS);
    }
  }, [open]);

  // If the dialog is unmounted while open, never leave the page scroll-locked.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (locked.current) {
        unlockScroll();
        locked.current = false;
      }
    },
    [],
  );

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${styles[variant]}`}
      aria-label={label}
      data-lenis-prevent
      data-surface="light"
      onCancel={(e) => {
        e.preventDefault(); // let our exit transition run instead of closing instantly
        onClose();
      }}
      onClose={() => {
        if (open) onClose(); // closed natively some other way
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // click on the backdrop
      }}
    >
      <div className={styles.inner}>{children}</div>
    </dialog>
  );
}
