"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Plus,
  ShieldCheck,
  ChevronDown,
  User,
  SettingsIcon,
  LogOut,
  Search,
  ArrowRightLeft,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DeviceDTO } from "@/lib/schema";
import AddDeviceModal from "@/components/modals/add-modal-devices";
import TransferModal from "@/components/modals/transfer-modal";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import DeviceRow from "@/components/device-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppInterface(): React.ReactElement {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [devices, setDevices] = useState<DeviceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [transferDevice, setTransferDevice] = useState<DeviceDTO | null>(null);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
    }
  }, [authStatus, router]);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/devices");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to load devices");
      }
      const data = await res.json();
      setDevices(data.data ?? []);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetchDevices();
    }
  }, [authStatus, fetchDevices]);

  async function handleDeleteAction(id: string) {
    try {
      const response = await fetch(`/api/devices/${id}`, { method: "DELETE" });
      if (response.ok) fetchDevices();
    } catch (error) {
      console.error("Delete failed", error);
    }
  }

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  const isGlobalLoading =
    authStatus === "loading" || (loading && devices.length === 0);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-slate-900 font-sans">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-full">
                  <ShieldCheck className="text-white w-5 h-5" />
                </div>
                <span className="text-lg font-bold tracking-tight">
                  DILI<span className="text-blue-600">VENTURES</span>
                </span>
              </div>
              <div className="hidden md:flex items-center gap-1">
                <TopNavLink label="Dashboard" active />
                <TopNavLink label="Devices" onClick={() => {}} />
                <Link
                  href="/search"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                >
                  <Search size={14} />
                  Search
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isGlobalLoading ? (
                <Skeleton className="h-8 w-8 rounded-full" />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 p-1 pr-3 hover:bg-slate-50 rounded-full transition-colors border border-transparent hover:border-slate-200 outline-none">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                        {userInitials}
                      </div>
                      <ChevronDown size={14} className="text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {session?.user?.name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {session?.user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600 cursor-pointer"
                      onClick={() => signOut()}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </nav>

      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto px-6 py-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
              <span>Workspace</span> <ChevronDown size={12} />
              <span className="text-slate-300">/</span>
              <span className="text-slate-900">Dashboard</span>
            </div>
            <Separator className="mb-2" />
            <div className="bg-linear-to-br from-blue-700 to-blue-900 rounded-xs p-6 text-white shadow-lg">
              <h1 className="text-2xl font-bold">
                Devices Management Dashboard
              </h1>
              <p className="text-xs text-blue-100 leading-relaxed md:w-1/2 mt-2">
                A secure digital ledger for registering and linking IMEI numbers
                and serial numbers to verified owners. Transfer ownership, check
                blacklist status, and generate instant device reports.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto px-6 py-8">
        {error && (
          <div className="p-4 mb-6 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between">
            <p className="text-sm text-red-600 font-medium">⚠ {error}</p>
            <Button onClick={fetchDevices} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Device Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="border rounded-xs shadow-sm overflow-hidden bg-white">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-bold uppercase text-blue-600">
                  Your Registered Devices
                </h2>
                <Button
                  variant="link"
                  onClick={() => setShowModal(true)}
                  className="text-[11px] font-bold uppercase"
                >
                  <Plus size={12} className="mr-1" /> Add New Device
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50">
                    <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                      <th className="px-6 py-3">Device info</th>
                      <th className="px-6 py-3">Identifier</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isGlobalLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td className="px-6 py-4">
                            <Skeleton className="h-4 w-32 rounded-sm" />
                          </td>
                          <td className="px-6 py-4">
                            <Skeleton className="h-4 w-24 rounded-sm" />
                          </td>
                          <td className="px-6 py-4">
                            <Skeleton className="h-4 w-24 rounded-full" />
                          </td>
                          <td className="px-6 py-4">
                            <Skeleton className="h-8 w-8 rounded-sm" />
                          </td>
                        </tr>
                      ))
                    ) : devices.length === 0 ? (
                      <tr>
                        <td colSpan={4}>
                          <EmptyState onAdd={() => setShowModal(true)} />
                        </td>
                      </tr>
                    ) : (
                      devices.map((device) => (
                        <DeviceRow
                          key={device._id}
                          device={device}
                          onDelete={handleDeleteAction}
                          onTransfer={(d) => setTransferDevice(d)}
                          onRefresh={fetchDevices}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pro Tip */}
            <div className="bg-linear-to-br from-blue-700 to-blue-900 rounded-xs p-6 text-white shadow-lg">
              <div className="bg-white/20 w-8 h-8 rounded-lg flex items-center justify-center mb-4">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-sm font-bold mb-2">Pro Tip: Secure Resale</h3>
              <p className="text-xs text-blue-100 leading-relaxed">
                Always initiate a "Digital Transfer" before handing over your
                device to ensure clean ownership transfer.
              </p>
            </div>

            {/* Quick Transfer */}
            <div className="bg-white border border-slate-200 rounded-xs p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4">
                Quick Transfer
              </h3>
              {devices.length > 0 ? (
                <div className="space-y-2">
                  {devices.slice(0, 3).map((d) => (
                    <button
                      key={d._id}
                      onClick={() => setTransferDevice(d)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left group"
                    >
                      <ArrowRightLeft
                        size={14}
                        className="text-slate-400 group-hover:text-blue-500 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">
                          {d.brand} {d.model}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          {d.imei ?? d.serialNumber}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-xs font-bold text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-all"
                >
                  Add a device to transfer
                </button>
              )}
            </div>

            {/* Search Device */}
            <div className="bg-white border border-slate-200 rounded-xs p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-3">
                Verify Any Device
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Check the status and ownership history of any device by IMEI or
                serial number.
              </p>
              <Link
                href="/search"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
              >
                <Search size={13} />
                Open Device Search
              </Link>
            </div>
          </div>
        </div>
      </main>

      {showModal && (
        <AddDeviceModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchDevices();
          }}
        />
      )}

      {transferDevice && (
        <TransferModal
          device={transferDevice}
          onClose={() => setTransferDevice(null)}
          onSuccess={() => {
            setTransferDevice(null);
            fetchDevices();
          }}
        />
      )}
    </div>
  );
}

function TopNavLink({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-slate-100 text-slate-900"
          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
      <div className="w-48 h-48 relative">
        <Image
          src="/Technical.png"
          alt="No devices"
          fill
          className="object-contain opacity-50"
        />
      </div>
      <p className="text-xs text-slate-500">No devices registered yet.</p>
      <Button onClick={onAdd} size="sm">
        Add Your First Device
      </Button>
    </div>
  );
}
