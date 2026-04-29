import type { ToastState } from '../types';

export default function Toast({ message, type, icon }: ToastState) {
  return (
    <div className={`toast show ${type}`}>
      <span className="toast-icon">{icon}</span>
      <span>{message}</span>
    </div>
  );
}
