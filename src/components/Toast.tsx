import { useEffect, useState } from "react";
import { useToast } from "../state/toastStore";

export function Toast() {
  const { message, key } = useToast();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!key) return;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 2600);
    return () => window.clearTimeout(timer);
  }, [key]);

  return (
    <div className={`toast ${visible ? "show" : ""}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
