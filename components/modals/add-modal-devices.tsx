"use client";

import { useState, useRef, useEffect } from "react";
import { isImeiFormat } from "@/lib/imei";
import { X, ShieldCheck, AlertCircle, CheckCircle2, Smartphone, Monitor } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

type DeviceType = "mobile" | "computer";
type DeviceCondition = "New" | "Used" | "Refurbished";
type OwnershipType = "Individual" | "Company";

const CONDITIONS: DeviceCondition[] = ["New", "Used", "Refurbished"];

export default function AddDeviceModal({ onClose, onSuccess }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [deviceType, setDeviceType] = useState<DeviceType>("mobile");
  const [condition, setCondition] = useState<DeviceCondition>("Used");
  const [ownershipType, setOwnershipType] = useState<OwnershipType>("Individual");

  const [form, setForm] = useState<Record<string, string>>({
    brand: "",
    model: "",
    imei: "",
    serialNumber: "",
    companyName: "",
  });
  const [imeiError, setImeiError] = useState<string | null>(null);
  const [serialError, setSerialError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

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

  function handleChange(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "imei") {
      const digits = value.replace(/\D/g, "");
      if (digits.length === 15 && !isImeiFormat(digits)) {
        setImeiError("Invalid IMEI sequence. Please check the digits.");
      } else {
        setImeiError(null);
      }
    }
    if (key === "serialNumber") {
      const sn = value.trim().toUpperCase();
      if (sn.length > 0 && (sn.length < 4 || !/^[A-Z0-9\-\/]+$/.test(sn))) {
        setSerialError("Serial number must be 4+ alphanumeric characters.");
      } else {
        setSerialError(null);
      }
    }
  }

  function switchType(type: DeviceType) {
    setDeviceType(type);
    setImeiError(null);
    setSerialError(null);
    setApiError(null);
  }

  async function handleSubmit() {
    setApiError(null);

    if (deviceType === "mobile") {
      if (!form.imei || form.imei.replace(/\D/g, "").length !== 15) {
        setImeiError("A valid 15-digit IMEI is required.");
        return;
      }
      if (imeiError) return;
    } else {
      if (!form.serialNumber || form.serialNumber.trim().length < 4) {
        setSerialError("A valid serial number is required.");
        return;
      }
      if (serialError) return;
    }

    if (!form.brand.trim()) { setApiError("Brand is required."); return; }
    if (!form.model.trim()) { setApiError("Model is required."); return; }
    if (ownershipType === "Company" && !form.companyName.trim()) {
      setApiError("Company / business name is required for company-owned devices.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        deviceType,
        brand: form.brand,
        model: form.model,
        condition,
        ownershipType,
        ...(ownershipType === "Company" ? { companyName: form.companyName.trim() } : {}),
      };
      if (deviceType === "mobile") {
        payload.imei = form.imei.replace(/\D/g, "");
      } else {
        payload.serialNumber = form.serialNumber.trim().toUpperCase();
      }

      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to register device.");
      onSuccess();
    } catch (e: unknown) {
      setApiError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const imeiDigits = form.imei.replace(/\D/g, "");

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Register New Device
              </h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                Identity & Ownership Verification
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
        <div className="px-6 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Device Type Toggle */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">
              Device Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => switchType("mobile")}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-sm font-bold transition-all ${
                  deviceType === "mobile"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                }`}
              >
                <Smartphone size={16} />
                Mobile Phone
              </button>
              <button
                type="button"
                onClick={() => switchType("computer")}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border text-sm font-bold transition-all ${
                  deviceType === "computer"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                }`}
              >
                <Monitor size={16} />
                Computer
              </button>
            </div>
          </div>

          {/* IMEI Field — mobile only */}
          {deviceType === "mobile" && (
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <label className="block text-[11px] font-bold text-blue-900 uppercase tracking-widest mb-1.5">
                IMEI Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={15}
                value={form.imei}
                onChange={(e) => handleChange("imei", e.target.value)}
                placeholder="Dial *#06# on your device"
                className={`w-full rounded-lg bg-white border px-4 py-2.5 text-sm font-mono ring-offset-2 focus:outline-none focus:ring-2 transition-all ${
                  imeiError
                    ? "border-red-300 focus:ring-red-100"
                    : imeiDigits.length === 15
                    ? "border-emerald-300 focus:ring-emerald-100 text-emerald-700"
                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
              {imeiError ? (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} /> {imeiError}
                </p>
              ) : imeiDigits.length === 15 ? (
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-medium">
                  <CheckCircle2 size={12} /> Verified Format
                </p>
              ) : (
                <p className="text-[10px] text-slate-500 mt-2 italic">
                  Enter the 15 digits found in your device settings.
                </p>
              )}
            </div>
          )}

          {/* Serial Number Field — computer only */}
          {deviceType === "computer" && (
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
              <label className="block text-[11px] font-bold text-blue-900 uppercase tracking-widest mb-1.5">
                Serial Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.serialNumber}
                onChange={(e) => handleChange("serialNumber", e.target.value)}
                placeholder="e.g. C02XK0LFJG5J"
                className={`w-full rounded-lg bg-white border px-4 py-2.5 text-sm font-mono ring-offset-2 focus:outline-none focus:ring-2 transition-all uppercase ${
                  serialError
                    ? "border-red-300 focus:ring-red-100"
                    : form.serialNumber.trim().length >= 4
                    ? "border-emerald-300 focus:ring-emerald-100 text-emerald-700"
                    : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
              {serialError ? (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} /> {serialError}
                </p>
              ) : form.serialNumber.trim().length >= 4 ? (
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-medium">
                  <CheckCircle2 size={12} /> Format OK
                </p>
              ) : (
                <p className="text-[10px] text-slate-500 mt-2 italic">
                  Found on the bottom/back of the device or in About This Mac / System Info.
                </p>
              )}
            </div>
          )}

          {/* Brand & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "brand", label: "Brand", placeholder: deviceType === "mobile" ? "e.g. Apple, Samsung" : "e.g. Apple, Dell, HP" },
              { key: "model", label: "Model", placeholder: deviceType === "mobile" ? "e.g. iPhone 15 Pro" : "e.g. MacBook Pro 14-inch" },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                  {f.label} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form[f.key]}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full rounded-lg bg-white border border-slate-300 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            ))}
          </div>

          {/* Device Condition */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">
              Device Condition
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(c)}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                    condition === c
                      ? "bg-blue-600 text-white border-blue-600 shadow-md"
                      : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Ownership Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">
              Ownership Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOwnershipType("Individual")}
                className={`py-2.5 px-4 rounded-lg border text-sm font-bold transition-all ${
                  ownershipType === "Individual"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setOwnershipType("Company")}
                className={`py-2.5 px-4 rounded-lg border text-sm font-bold transition-all ${
                  ownershipType === "Company"
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                }`}
              >
                Company
              </button>
            </div>
            {ownershipType === "Company" && (
              <div className="mt-3">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">
                  Company / Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                  placeholder="e.g. Acme Logistics Ltd"
                  className="w-full rounded-lg bg-white border border-slate-300 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            )}
          </div>

          {apiError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle size={14} /> {apiError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !!(deviceType === "mobile" && imeiError) ||
              !!(deviceType === "computer" && serialError)
            }
            className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-400 text-white text-sm font-bold shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
          >
            {submitting ? "Processing..." : "Complete Registration"}
          </button>
        </div>
      </div>
    </div>
  );
}
