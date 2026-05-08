"use client";

import { useState } from "react";
import {
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ArrowRightLeft,
  Flag,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { DeviceDTO } from "@/lib/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  device: DeviceDTO;
  onDelete: (id: string) => Promise<void>;
  onTransfer?: (device: DeviceDTO) => void;
  onRefresh?: () => void;
}

type ModalType = "flag" | "unflag" | null;

export default function DeviceRow({ device, onDelete, onTransfer, onRefresh }: Props) {
  const [modalType, setModalType] = useState<ModalType>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [busy, setBusy] = useState(false);

  const isComputer = device.deviceType === "computer";
  const identifier = isComputer ? device.serialNumber ?? "—" : formatImei(device.imei ?? "");
  const isFlagged = device.status === "Flagged";

  function openModal(type: ModalType) {
    setReason("");
    setReasonError("");
    setModalType(type);
  }

  function closeModal() {
    if (busy) return;
    setModalType(null);
    setReason("");
    setReasonError("");
  }

  async function handleStatusUpdate() {
    if (modalType === "flag" && !reason.trim()) {
      setReasonError("Please enter a reason before confirming.");
      return;
    }

    setBusy(true);
    setReasonError("");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const payload =
        modalType === "flag"
          ? { status: "Flagged", flagReason: reason.trim() }
          : { status: "Clean", flagReason: reason.trim() || undefined };

      const res = await fetch(`/api/devices/${device._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setReasonError((d as { error?: string }).error ?? "Update failed. Please try again.");
        return;
      }

      setModalType(null);
      onRefresh?.();
    } catch (e: unknown) {
      const msg =
        (e as { name?: string }).name === "AbortError"
          ? "Request timed out. Check your connection and try again."
          : "Could not reach the server. Please try again.";
      setReasonError(msg);
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }

  async function handleDelete() {
    const label = isComputer ? `S/N: ${device.serialNumber}` : device.imei;
    if (!confirm(`Remove "${device.brand} ${device.model}" (${label}) from your listings?`)) return;
    setBusy(true);
    try {
      await onDelete(device._id);
    } catch {
      setBusy(false);
    }
  }

  return (
    <>
      <tr className={`hover:bg-slate-50/50 transition-colors ${busy ? "opacity-60 pointer-events-none" : ""}`}>
        {/* Device Info */}
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
              {isComputer ? <Monitor size={16} /> : <Smartphone size={16} />}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{device.brand}</p>
              <p className="text-[11px] text-slate-500">{device.model}</p>
            </div>
          </div>
        </td>

        {/* Identifier */}
        <td className="px-6 py-4">
          <p className="text-xs font-mono text-slate-600 tracking-tighter">{identifier}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{isComputer ? "Serial No." : "IMEI"}</p>
        </td>

        {/* Status */}
        <td className="px-6 py-4">
          <div>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isFlagged
                  ? "bg-red-50 text-red-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {isFlagged ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
              {device.status}
            </span>
            {isFlagged && device.flagReason && (
              <p className="text-[10px] text-red-500 mt-0.5 font-medium">{device.flagReason}</p>
            )}
          </div>
        </td>

        {/* Actions */}
        <td className="px-6 py-4 text-right">
          <div className="flex justify-end items-center gap-1">
            {/* Transfer */}
            {onTransfer && (
              <button
                onClick={() => onTransfer(device)}
                className="p-1.5 rounded-md text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                title="Transfer device"
              >
                <ArrowRightLeft size={14} />
              </button>
            )}

            {/* Flag / Unflag toggle button */}
            {isFlagged ? (
              <button
                onClick={() => openModal("unflag")}
                title="Mark as Clean"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                <ShieldCheck size={12} />
                Mark Clean
              </button>
            ) : (
              <button
                onClick={() => openModal("flag")}
                title="Flag this device"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <Flag size={12} />
                Flag
              </button>
            )}

            {/* More options — Delete only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors outline-none"
                  title="More options"
                >
                  <MoreVertical size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 overflow-hidden">
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 size={14} />
                  Delete Device
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>

      {/* Flag / Unflag Dialog */}
      <Dialog open={modalType !== null} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalType === "flag" ? (
                <>
                  <Flag size={18} className="text-amber-500" />
                  Flag Device
                </>
              ) : (
                <>
                  <ShieldCheck size={18} className="text-emerald-500" />
                  Mark as Clean
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {modalType === "flag"
                ? `You are flagging "${device.brand} ${device.model}". Provide a reason so the record is accurate.`
                : `You are clearing the flag on "${device.brand} ${device.model}". Optionally note why it's being cleared.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest">
              {modalType === "flag" ? "Reason *" : "Unflag note (optional)"}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => { setReason(e.target.value); setReasonError(""); }}
              placeholder={
                modalType === "flag"
                  ? "e.g. Stolen on 12 June, reported to police"
                  : "e.g. Device recovered / returned by buyer"
              }
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleStatusUpdate(); }}
            />
            {reasonError && (
              <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle size={12} />
                {reasonError}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={busy}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStatusUpdate}
              disabled={busy}
              className={`px-5 py-2 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-50 ${
                modalType === "flag"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {busy
                ? "Saving…"
                : modalType === "flag"
                ? "Confirm Flag"
                : "Confirm"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatImei(imei: string): string {
  if (imei.length !== 15) return imei;
  return `${imei.slice(0, 8)} ${imei.slice(8, 14)} ${imei.slice(14)}`;
}
