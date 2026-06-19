"use client";

import { useEffect, useState } from "react";
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
  History,
  Pencil,
  Building2,
  User,
} from "lucide-react";
import type { DeviceDTO, DeviceCondition, OwnershipType, FlagHistoryDTO } from "@/lib/schema";
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
  ownerName?: string | null;
  ownerEmail?: string | null;
}

type ModalType = "flag" | "unflag" | "history" | "edit" | null;

const CONDITIONS: DeviceCondition[] = ["New", "Used", "Refurbished"];

export default function DeviceRow({ device, onDelete, onTransfer, onRefresh, ownerName, ownerEmail }: Props) {
  const [modalType, setModalType] = useState<ModalType>(null);
  const [reason, setReason] = useState("");
  const [incidentLocation, setIncidentLocation] = useState("");
  const [incidentAt, setIncidentAt] = useState("");
  const [policeObNumber, setPoliceObNumber] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [busy, setBusy] = useState(false);

  const [editCondition, setEditCondition] = useState<DeviceCondition>(device.condition ?? "Used");
  const [editOwnershipType, setEditOwnershipType] = useState<OwnershipType>(device.ownershipType ?? "Individual");
  const [editCompanyName, setEditCompanyName] = useState(device.companyName ?? "");
  const [editError, setEditError] = useState("");

  const [historyEntries, setHistoryEntries] = useState<FlagHistoryDTO[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const isComputer = device.deviceType === "computer";
  const identifier = isComputer ? device.serialNumber ?? "—" : formatImei(device.imei ?? "");
  const isFlagged = device.status === "Flagged";
  const ownerLabel = ownerName ?? ownerEmail ?? "—";

  function openModal(type: ModalType) {
    setReason("");
    setIncidentLocation("");
    setIncidentAt("");
    setPoliceObNumber("");
    setReasonError("");
    setModalType(type);
  }

  function openEditModal() {
    setEditCondition(device.condition ?? "Used");
    setEditOwnershipType(device.ownershipType ?? "Individual");
    setEditCompanyName(device.companyName ?? "");
    setEditError("");
    setModalType("edit");
  }

  function closeModal() {
    if (busy) return;
    setModalType(null);
    setReason("");
    setIncidentLocation("");
    setIncidentAt("");
    setPoliceObNumber("");
    setReasonError("");
    setEditError("");
  }

  useEffect(() => {
    if (modalType !== "history") return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError("");
    fetch(`/api/devices/${device._id}/history`)
      .then(async (res) => {
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((d as { error?: string }).error ?? "Failed to load history");
        if (!cancelled) setHistoryEntries((d as { data: FlagHistoryDTO[] }).data ?? []);
      })
      .catch((e: unknown) => {
        if (!cancelled) setHistoryError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [modalType, device._id]);

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
          ? {
              status: "Flagged",
              flagReason: reason.trim(),
              ...(incidentLocation.trim() ? { incidentLocation: incidentLocation.trim() } : {}),
              ...(incidentAt ? { incidentAt: new Date(incidentAt).toISOString() } : {}),
              ...(policeObNumber.trim() ? { policeObNumber: policeObNumber.trim() } : {}),
            }
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

  async function handleEditSave() {
    if (editOwnershipType === "Company" && !editCompanyName.trim()) {
      setEditError("Company / business name is required for company-owned devices.");
      return;
    }

    setBusy(true);
    setEditError("");

    try {
      const payload = {
        condition: editCondition,
        ownershipType: editOwnershipType,
        ...(editOwnershipType === "Company" ? { companyName: editCompanyName.trim() } : {}),
      };

      const res = await fetch(`/api/devices/${device._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setEditError((d as { error?: string }).error ?? "Update failed. Please try again.");
        return;
      }

      setModalType(null);
      onRefresh?.();
    } catch {
      setEditError("Could not reach the server. Please try again.");
    } finally {
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
              <div className="flex items-center gap-2 mt-1">
                {device.ownershipType && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    {device.ownershipType === "Company" ? <Building2 size={10} /> : <User size={10} />}
                    {device.ownershipType === "Company" ? device.companyName ?? "Company" : "Individual"}
                  </span>
                )}
                {device.condition && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                    {device.condition}
                  </span>
                )}
              </div>
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
            {isFlagged && (
              <div className="mt-1 space-y-0.5">
                {device.flagReason && (
                  <p className="text-[10px] text-red-500 font-medium">{device.flagReason}</p>
                )}
                {device.flaggedAt && (
                  <p className="text-[10px] text-slate-400">
                    Flagged on {formatDate(device.flaggedAt)}
                  </p>
                )}
                {device.incidentLocation && (
                  <p className="text-[10px] text-slate-400">
                    Place of incident: {device.incidentLocation}
                  </p>
                )}
                {device.incidentAt && (
                  <p className="text-[10px] text-slate-400">
                    Time of incident: {formatDate(device.incidentAt)}
                  </p>
                )}
                {device.policeObNumber && (
                  <p className="text-[10px] text-slate-400">
                    Police OB No: {device.policeObNumber}
                  </p>
                )}
                <p className="text-[10px] text-slate-400">
                  Registered owner: {ownerLabel}
                </p>
                {typeof device.daysInTracking === "number" && (
                  <p className="text-[10px] font-bold text-amber-600">
                    In tracking for {device.daysInTracking} day{device.daysInTracking === 1 ? "" : "s"}
                  </p>
                )}
              </div>
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

            {/* More options */}
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
                <DropdownMenuItem onClick={openEditModal} className="gap-2 cursor-pointer">
                  <Pencil size={14} />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openModal("history")} className="gap-2 cursor-pointer">
                  <History size={14} />
                  View History
                </DropdownMenuItem>
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
      <Dialog open={modalType === "flag" || modalType === "unflag"} onOpenChange={(open) => { if (!open) closeModal(); }}>
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
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                {modalType === "flag" ? "Reason *" : "Unflag note (optional)"}
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => { setReason(e.target.value); setReasonError(""); }}
                placeholder={
                  modalType === "flag"
                    ? "e.g. Stolen / Lost / Fraud"
                    : "e.g. Device recovered / returned by buyer"
                }
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter" && modalType === "unflag") handleStatusUpdate(); }}
              />
            </div>

            {modalType === "flag" && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                    Place of Incident (optional)
                  </label>
                  <input
                    type="text"
                    value={incidentLocation}
                    onChange={(e) => setIncidentLocation(e.target.value)}
                    placeholder="e.g. Nairobi CBD, Moi Avenue"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                    Date &amp; Time of Incident (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={incidentAt}
                    onChange={(e) => setIncidentAt(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                    Police OB No. (optional)
                  </label>
                  <input
                    type="text"
                    value={policeObNumber}
                    onChange={(e) => setPoliceObNumber(e.target.value)}
                    placeholder="e.g. OB/123/2026"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </>
            )}

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

      {/* Edit Details Dialog */}
      <Dialog open={modalType === "edit"} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil size={18} className="text-blue-500" />
              Edit Details
            </DialogTitle>
            <DialogDescription>
              Update ownership and condition for &quot;{device.brand} {device.model}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                Device Condition
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CONDITIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditCondition(c)}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                      editCondition === c
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                Ownership Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditOwnershipType("Individual")}
                  className={`py-2.5 px-4 rounded-lg border text-sm font-bold transition-all ${
                    editOwnershipType === "Individual"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setEditOwnershipType("Company")}
                  className={`py-2.5 px-4 rounded-lg border text-sm font-bold transition-all ${
                    editOwnershipType === "Company"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  Company
                </button>
              </div>
              {editOwnershipType === "Company" && (
                <input
                  type="text"
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  placeholder="Company / Business Name"
                  className="mt-3 w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              )}
            </div>

            {editError && (
              <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                <AlertCircle size={12} />
                {editError}
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
              onClick={handleEditSave}
              disabled={busy}
              className="px-5 py-2 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-50 bg-blue-600 hover:bg-blue-700"
            >
              {busy ? "Saving…" : "Save Changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={modalType === "history"} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History size={18} className="text-slate-500" />
              Status History
            </DialogTitle>
            <DialogDescription>
              Flag / unflag timeline for &quot;{device.brand} {device.model}&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto space-y-3 py-2">
            {historyLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : historyError ? (
              <p className="text-sm text-red-600">{historyError}</p>
            ) : historyEntries.length === 0 ? (
              <p className="text-sm text-slate-500">No status changes recorded yet.</p>
            ) : (
              historyEntries.map((entry) => (
                <div key={entry._id} className="rounded-lg border border-slate-200 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        entry.action === "Flagged"
                          ? "bg-red-50 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {entry.action === "Flagged" ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                      {entry.action}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatDate(entry.changedAt)}</span>
                  </div>
                  {entry.reason && <p className="text-xs text-slate-700 mt-2 font-medium">{entry.reason}</p>}
                  {entry.incidentLocation && (
                    <p className="text-[10px] text-slate-500 mt-1">Place of incident: {entry.incidentLocation}</p>
                  )}
                  {entry.incidentAt && (
                    <p className="text-[10px] text-slate-500 mt-1">Time of incident: {formatDate(entry.incidentAt)}</p>
                  )}
                  {entry.policeObNumber && (
                    <p className="text-[10px] text-slate-500 mt-1">Police OB No: {entry.policeObNumber}</p>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Close
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

function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
