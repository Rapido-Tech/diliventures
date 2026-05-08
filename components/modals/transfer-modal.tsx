"use client";

import { useState, useRef, useEffect } from "react";
import { X, ArrowRightLeft, AlertCircle, CheckCircle2, Smartphone, Monitor } from "lucide-react";
import type { DeviceDTO } from "@/lib/schema";

interface Props {
  device: DeviceDTO;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferModal({ device, onClose, onSuccess }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [toEmail, setToEmail] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isComputer = device.deviceType === "computer";
  const identifier = isComputer
    ? `S/N: ${device.serialNumber}`
    : `IMEI: ${formatImei(device.imei ?? "")}`;

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!toEmail.trim() || !toEmail.includes("@")) {
      setError("Please enter a valid recipient email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: device._id,
          toEmail: toEmail.trim().toLowerCase(),
          price: price ? parseFloat(price) : 0,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transfer failed");
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
              <ArrowRightLeft className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Transfer Device</h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                Change Ownership
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          {/* Device Info Card */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              {isComputer ? <Monitor size={18} /> : <Smartphone size={18} />}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {device.brand} {device.model}
              </p>
              <p className="text-xs text-slate-500 font-mono">{identifier}</p>
            </div>
          </div>

          {success ? (
            <div className="flex flex-col items-center py-6 gap-3">
              <CheckCircle2 className="text-emerald-500 w-12 h-12" />
              <p className="text-sm font-bold text-slateald-800">Transfer Successful!</p>
              <p className="text-xs text-slate-500 text-center">
                Device ownership has been transferred. It will no longer appear in your list.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                  Recipient Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  required
                  className="w-full rounded-lg bg-white border border-slate-300 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1.5">
                  The recipient must have a DILI account.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                  Sale Price (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg bg-white border border-slate-300 pl-8 pr-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Sold in person, condition agreed upon"
                  rows={2}
                  className="w-full rounded-lg bg-white border border-slate-300 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-xs font-medium flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-xs text-amber-800 font-medium">
                  ⚠ This action is permanent. Once transferred, ownership moves immediately to the recipient.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                >
                  {submitting ? "Transferring..." : "Confirm Transfer"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function formatImei(imei: string): string {
  if (imei.length !== 15) return imei;
  return `${imei.slice(0, 8)} ${imei.slice(8, 14)} ${imei.slice(14)}`;
}
