// usePanelResize: ratio-based drag state for the preview column (1 = full width, 0 = mobile)
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_PREVIEW = 360;
const MIN_CHAT = 420;

export default function usePanelResize({ open } = {}) {
  const containerRef = useRef(null);
  const [ratio, setRatio] = useState(1); // 1 = preview takes the full remaining width

  // closing the panel always resets to full width
  useEffect(() => {
    if (!open) setRatio(1);
  }, [open]);

  // drag: ratio of the draggable space between the chat and preview minimums
  const onPointerDown = useCallback((event) => {
    event.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const styles = window.getComputedStyle(container);
    const contentLeft = rect.left + (parseFloat(styles.paddingLeft) || 0);
    const contentRight = rect.right - (parseFloat(styles.paddingRight) || 0);
    const denominator = contentRight - contentLeft - MIN_CHAT - MIN_PREVIEW;

    const move = (e) => {
      const value =
        denominator > 0 ? (contentRight - e.clientX - MIN_PREVIEW) / denominator : 1;
      setRatio(Math.min(Math.max(value, 0), 1));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }, []);

  // CSS calc follows window resizes automatically, no JS clamping needed
  const previewStyle = { "--panel-w": `calc(360px + (100% - 780px) * ${ratio})` };

  return { containerRef, ratio, previewStyle, onPointerDown };
}
