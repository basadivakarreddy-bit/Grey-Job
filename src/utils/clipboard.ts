/**
 * Copies text to the clipboard with modern Navigator Clipboard API
 * and an automatic fallback to document.execCommand('copy') for iframes/restricted environments.
 */
export async function copyToClipboard(text: string): Promise<{ success: boolean; error?: string }> {
  if (text === undefined || text === null) {
    return { success: false, error: 'No content to copy' };
  }

  // First try modern navigator.clipboard
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } catch {
      // Fallback below
    }
  }

  // Fallback using textarea execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (successful) {
      return { success: true };
    }
    return { success: false, error: 'Clipboard copy command returned false.' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown clipboard error';
    return { success: false, error: message };
  }
}
