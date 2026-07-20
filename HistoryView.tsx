/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import {
  Search,
  Filter,
  Calendar,
  FileText,
  Clock,
  User,
  Eye,
  Trash2,
  AlertCircle,
  TrendingUp,
  Inbox,
  ShieldCheck,
  DollarSign
} from "lucide-react";
import { Receipt, getNormalizedStatus } from "../types";
import { motion } from "motion/react";

interface HistoryViewProps {
  onSelectReceipt: (receipt: Receipt) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onSelectReceipt }) => {
  const { receipts, deleteReceipt, updateReceipt, clients } = useApp();
  const formatCOP = (val: number) => "$" + Math.round(val).toLocaleString("es-CO");

  const [searchText, setSearchText] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(""); // "" means All
  const [selectedYear, setSelectedYear] = useState(""); // "" means All
  const [selectedStatus, setSelectedStatus] = useState(""); // "" means All
  const [selectedWarranty, setSelectedWarranty] = useState(""); // "" means All
  const [deletingReceiptId, setDeletingReceiptId] = useState<string | null>(null);

  // Month Names translation helper
  const monthNames = [
    { value: "0", label: "Enero" },
    { value: "1", label: "Febrero" },
    { value: "2", label: "Marzo" },
    { value: "3", label: "Abril" },
    { value: "4", label: "Mayo" },
    { value: "5", label: "Junio" },
    { value: "6", label: "Julio" },
    { value: "7", label: "Agosto" },
    { value: "8", label: "Septiembre" },
    { value: "9", label: "Octubre" },
    { value: "10", label: "Noviembre" },
    { value: "11", label: "Diciembre" }
  ];

  // Dynamically extract all available years in existing receipts for the filter
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    receipts.forEach((r) => {
      try {
        const yr = new Date(r.date).getFullYear().toString();
        years.add(yr);
      } catch {}
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [receipts]);

  // Helper to calculate detailed warranty info
  const getWarrantyDetails = (r: Receipt) => {
    const daysStr = r.warranty || "30 días";
    const daysMatch = daysStr.match(/\d+/);
    const days = daysMatch ? parseInt(daysMatch[0], 10) : 30;
    
    const purchaseDate = new Date(r.date);
    const expirationDate = new Date(purchaseDate.getTime() + days * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    // Calculate remaining time
    const msRemaining = expirationDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    
    let label = "";
    let badgeColor = "";
    let iconColor = "";
    let status: "active" | "soon" | "expired" = "active";
    
    if (daysRemaining <= 0) {
      label = "Garantía vencida";
      badgeColor = "bg-red-50 text-red-700 border-red-150";
      iconColor = "text-red-500";
      status = "expired";
    } else if (daysRemaining <= 7) {
      label = `⚠️ Próxima (${daysRemaining} d)`;
      badgeColor = "bg-amber-50 text-amber-700 border-amber-150";
      iconColor = "text-amber-500";
      status = "soon";
    } else {
      label = `🛡️ Activa (${daysRemaining} d)`;
      badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-150";
      iconColor = "text-emerald-500";
      status = "active";
    }
    
    return {
      daysRemaining,
      expirationDate,
      label,
      badgeColor,
      iconColor,
      status
    };
  };

  // Filter receipts logic
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      // 1. Search text filter (matches name, phone, consecutive, service, order id, month, or year)
      const search = searchText.toLowerCase().trim();
      if (search !== "") {
        // Matches basic info
        const matchesBasic =
          r.clientName.toLowerCase().includes(search) ||
          r.clientPhone.includes(search) ||
          r.consecutive.toString().includes(search) ||
          r.id.toLowerCase().includes(search);

        let matchesServices = false;
        if (!matchesBasic) {
          matchesServices = r.services.some((item) => {
            const sNetwork = item.socialNetworkName.toLowerCase();
            const sName = item.serviceName.toLowerCase();
            const orderIdMatch = (item.orderId || "").toLowerCase().includes(search) || 
                                 (item.orderIds || []).some(id => id.toLowerCase().includes(search));
            return sNetwork.includes(search) || sName.includes(search) || orderIdMatch;
          });
        }

        let matchesMonthYear = false;
        if (!matchesBasic && !matchesServices) {
          try {
            const d = new Date(r.date);
            const monthIndex = d.getMonth();
            const monthLabel = monthNames[monthIndex]?.label.toLowerCase() || "";
            const yearStr = d.getFullYear().toString();
            if (monthLabel.includes(search) || yearStr === search) {
              matchesMonthYear = true;
            }
          } catch {}
        }

        if (!matchesBasic && !matchesServices && !matchesMonthYear) {
          return false;
        }
      }

      // 2. Dropdown month filter
      if (selectedMonth !== "") {
        try {
          const rDate = new Date(r.date);
          if (rDate.getMonth().toString() !== selectedMonth) return false;
        } catch {
          return false;
        }
      }

      // 3. Dropdown year filter
      if (selectedYear !== "") {
        try {
          const rDate = new Date(r.date);
          if (rDate.getFullYear().toString() !== selectedYear) return false;
        } catch {
          return false;
        }
      }

      // 4. Dropdown status filter
      if (selectedStatus !== "") {
        if (getNormalizedStatus(r.status) !== selectedStatus) return false;
      }

      // 5. Dropdown warranty filter
      if (selectedWarranty !== "") {
        const warrantyDetails = getWarrantyDetails(r);
        if (selectedWarranty === "activa") {
          if (warrantyDetails.status !== "active") return false;
        } else if (selectedWarranty === "proxima") {
          if (warrantyDetails.status !== "soon") return false;
        } else if (selectedWarranty === "vencida") {
          if (warrantyDetails.status !== "expired") return false;
        } else if (selectedWarranty === "en_proceso") {
          if (getNormalizedStatus(r.status) !== "garantia_en_proceso") return false;
        }
      }

      return true;
    });
  }, [receipts, searchText, selectedMonth, selectedYear, selectedStatus, selectedWarranty]);

  // Total charged, cost, and profit of filtered receipts
  const filteredMetrics = useMemo(() => {
    let totalCharged = 0;
    let totalCost = 0;
    let totalProfit = 0;
    filteredReceipts.forEach((r) => {
      totalCharged += r.totalCharged || 0;
      totalCost += r.totalProviderCost || 0;
      totalProfit += r.totalProfit || 0;
    });
    return { totalCharged, totalCost, totalProfit };
  }, [filteredReceipts]);

  // Format Date for table
  const formatDateSimple = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Historial de Comprobantes</h2>
          <p className="text-xs text-gray-500 mt-1">Gestione, busque y actualice el estado de los comprobantes emitidos</p>
        </div>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-indigo-500" />
            </div>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar por cliente, consecutivo, ID proveedor..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-xs bg-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition font-medium"
            />
          </div>

          {/* Estado Selector */}
          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="block w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs font-semibold bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="">Todos los Estados</option>
              <option value="en_proceso">🟢 En proceso</option>
              <option value="completado">✅ Completado</option>
              <option value="garantia_en_proceso">🟡 Garantía en proceso</option>
              <option value="cancelado">🔴 Cancelado</option>
            </select>
          </div>

          {/* Garantía Selector */}
          <div className="md:col-span-2">
            <select
              value={selectedWarranty}
              onChange={(e) => setSelectedWarranty(e.target.value)}
              className="block w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs font-semibold bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="">Todas las Garantías</option>
              <option value="activa">🟢 Garantía activa</option>
              <option value="proxima">🟡 Próxima a vencer</option>
              <option value="vencida">🔴 Garantía vencida</option>
              <option value="en_proceso">⚙️ Garantía en proceso</option>
            </select>
          </div>

          {/* Month Selector */}
          <div className="md:col-span-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="block w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs font-semibold bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="">Todos los Meses</option>
              {monthNames.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="md:col-span-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="block w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs font-semibold bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="">Todos los Años</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Indicator / Total of search results */}
        <div className="flex flex-wrap justify-between items-center gap-3 text-xs text-gray-500 border-t border-gray-100 pt-3">
          <div>
            Mostrando <strong className="text-gray-900">{filteredReceipts.length}</strong> de{" "}
            <strong className="text-gray-900">{receipts.length}</strong> comprobantes
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-slate-50 text-slate-700 px-2 py-0.5 rounded-sm font-semibold border border-slate-200">
              Costo: {formatCOP(filteredMetrics.totalCost)}
            </span>
            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-sm font-semibold border border-indigo-150">
              Cobrado: {formatCOP(filteredMetrics.totalCharged)}
            </span>
            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-sm font-semibold border border-emerald-150">
              Ganancia: {formatCOP(filteredMetrics.totalProfit)}
            </span>
            
            {(searchText || selectedMonth || selectedYear || selectedStatus || selectedWarranty) && (
              <button
                onClick={() => {
                  setSearchText("");
                  setSelectedMonth("");
                  setSelectedYear("");
                  setSelectedStatus("");
                  setSelectedWarranty("");
                }}
                className="text-indigo-600 hover:text-indigo-800 font-bold transition cursor-pointer ml-1"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Receipts Table Area */}
      {filteredReceipts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <Inbox className="w-12 h-12 text-indigo-200 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-700">No se encontraron comprobantes</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto mt-1 leading-relaxed">
            Intente cambiar la consulta de búsqueda o restablecer los filtros para ver los comprobantes almacenados.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse animate-fade-in">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-150 text-xs">
                  <th className="py-3.5 px-4 font-bold text-gray-500 uppercase tracking-wider text-center">Comprobante</th>
                  <th className="py-3.5 px-4 font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="py-3.5 px-4 font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="py-3.5 px-4 font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="py-3.5 px-4 font-bold text-gray-500 uppercase tracking-wider">IDs Proveedor</th>
                  <th className="py-3.5 px-4 font-bold text-gray-500 uppercase tracking-wider">Garantía</th>
                  <th className="py-3.5 px-4 font-bold text-gray-500 uppercase tracking-wider text-right">Valores</th>
                  <th className="py-3.5 px-4 font-bold text-gray-500 uppercase tracking-wider text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 text-xs">
                {filteredReceipts.map((r) => {
                  const clientObj = clients.find(
                    (c) =>
                      c.name.trim().toLowerCase() === r.clientName.trim().toLowerCase() &&
                      c.phone.trim() === r.clientPhone.trim()
                  );
                  const clientTag = clientObj?.tag;

                  // Tag style class
                  let tagStyle = "";
                  if (clientTag === "VIP") tagStyle = "bg-purple-100 text-purple-800 border-purple-200";
                  else if (clientTag === "Frecuente") tagStyle = "bg-blue-100 text-blue-800 border-blue-200";
                  else if (clientTag === "Mayorista") tagStyle = "bg-emerald-100 text-emerald-800 border-emerald-200";
                  else if (clientTag === "Nuevo") tagStyle = "bg-gray-100 text-gray-700 border-gray-200";

                  // Warranty Details
                  const wInfo = getWarrantyDetails(r);

                  // Extract order IDs
                  const providerIds = r.services.flatMap((s) =>
                    s.orderIds && s.orderIds.length > 0 ? s.orderIds : s.orderId ? [s.orderId] : []
                  );

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/40 transition">
                      {/* Consecutive Number */}
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 text-center">
                        #{r.consecutive}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-gray-500 font-mono">
                        {formatDateSimple(r.date)}
                      </td>

                      {/* Client name and phone with tag */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-gray-900">{r.clientName}</span>
                          {clientTag && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold border ${tagStyle}`}>
                              {clientTag}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-gray-400 mt-0.5">{r.clientPhone}</div>
                      </td>

                      {/* Status select editor */}
                      <td className="py-3 px-4">
                        <select
                          value={getNormalizedStatus(r.status)}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            try {
                              await updateReceipt(r.id, { status: newStatus as any });
                            } catch (err) {
                              console.error("Error updating status in history row:", err);
                            }
                          }}
                          className="text-[11px] font-semibold rounded-md border border-gray-200 bg-white px-2 py-1 text-gray-800 focus:outline-hidden cursor-pointer"
                        >
                          <option value="en_proceso">🟢 En proceso</option>
                          <option value="completado">✅ Completado</option>
                          <option value="garantia_en_proceso">🟡 Garantía en proceso</option>
                          <option value="cancelado">🔴 Cancelado</option>
                        </select>
                      </td>

                      {/* Provider IDs */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[130px]">
                          {providerIds.length === 0 ? (
                            <span className="text-gray-400 italic text-[10px]">Ninguno</span>
                          ) : (
                            providerIds.map((id, idx) => (
                              <span
                                key={idx}
                                className="bg-slate-100 text-slate-700 font-mono font-bold text-[9px] px-1 py-0.5 rounded border border-slate-200 truncate"
                                title={id}
                              >
                                {id}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Warranty Status & End Date */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${wInfo.badgeColor}`}>
                            <span>{wInfo.label}</span>
                          </span>
                          <div className="text-[10px] text-gray-400 font-mono">
                            Vence: {wInfo.expirationDate.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                          </div>
                        </div>
                      </td>

                      {/* Financial info */}
                      <td className="py-3 px-4 text-right font-mono text-[11px] whitespace-nowrap">
                        <div>
                          <span className="text-gray-400">Cobrado:</span>{" "}
                          <strong className="text-indigo-600 font-bold">{formatCOP(r.totalCharged)}</strong>
                        </div>
                        <div className="text-[10px]">
                          <span className="text-gray-400">Costo:</span>{" "}
                          <span className="text-gray-600">{formatCOP(r.totalProviderCost || 0)}</span>
                        </div>
                        <div className="text-[10px]">
                          <span className="text-gray-400">Ganancia:</span>{" "}
                          <strong className="text-emerald-600 font-bold">{formatCOP(r.totalProfit || 0)}</strong>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        {deletingReceiptId === r.id ? (
                          <div className="inline-flex items-center gap-1 bg-red-50 p-1 rounded border border-red-100 shrink-0 animate-fade-in justify-center">
                            <span className="text-[9px] font-bold text-red-600 uppercase mr-1">¿Borrar?</span>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await deleteReceipt(r.id);
                                } catch (err) {
                                  console.error(err);
                                } finally {
                                  setDeletingReceiptId(null);
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition"
                            >
                              Sí
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingReceiptId(null)}
                              className="bg-white border border-gray-200 text-gray-700 text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              id={`btn-view-receipt-${r.consecutive}`}
                              onClick={() => onSelectReceipt(r)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 transition px-2 py-1 rounded-md shadow-2xs cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Ver
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingReceiptId(r.id)}
                              className="inline-flex items-center text-red-500 hover:text-red-700 bg-white border border-red-100 hover:bg-red-50 transition p-1 rounded-md shadow-2xs cursor-pointer"
                              title="Eliminar Comprobante"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
