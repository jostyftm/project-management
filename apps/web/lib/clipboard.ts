/**
 * Copia texto al portapapeles de manera universal y segura.
 * 
 * Funciona tanto en contextos seguros (HTTPS, localhost) usando la API moderna de
 * Clipboard (`navigator.clipboard.writeText`), como en despliegues sobre HTTP o
 * entornos restringidos mediante el fallback seguro `document.execCommand('copy')`.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }

  // 1. Intentar API moderna de Clipboard si está disponible en contexto seguro
  if (typeof navigator !== "undefined" && navigator?.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Si falla por permisos o política de contexto no seguro, intentar fallback
      console.warn("Fallo navigator.clipboard.writeText, recurriendo a fallback:", err);
    }
  }

  // 2. Fallback con textarea y execCommand para entornos HTTP o navegadores antiguos
  if (typeof document !== "undefined") {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      // Posicionamiento fuera de pantalla sin alterar scroll ni render
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "-9999px";
      textArea.style.opacity = "0";
      textArea.style.pointerEvents = "none";
      textArea.setAttribute("readonly", "");
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, textArea.value.length);

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      return successful;
    } catch (fallbackErr) {
      console.error("No se pudo copiar el texto mediante execCommand:", fallbackErr);
      return false;
    }
  }

  return false;
}
