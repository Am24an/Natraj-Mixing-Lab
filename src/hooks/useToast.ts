// useToast Hook — convenience hook for adding toast notifications
// Separated from ToastContainer.tsx per react-refresh/only-export-components rule

import { useEditorStore } from '@/stores/editorStore';

export function useToast() {
  const addToast = useEditorStore((s) => s.addToast);

  return {
    success: (title: string, description?: string) =>
      addToast({ variant: 'success', title, description }),
    error: (title: string, description?: string) =>
      addToast({ variant: 'error', title, description }),
    warning: (title: string, description?: string) =>
      addToast({ variant: 'warning', title, description }),
    info: (title: string, description?: string) =>
      addToast({ variant: 'info', title, description }),
  };
}
