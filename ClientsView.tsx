/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import {
  Search,
  User,
  Phone,
  FileText,
  DollarSign,
  TrendingUp,
  Award,
  ChevronRight,
  Eye,
  Calendar,
  Inbox
} from "lucide-react";
import { Client, Receipt } from "../types";
import { motion } from "motion/react";

interface ClientsViewProps {
  onSelectReceipt: (receipt: Receipt) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ onSelectReceipt }) => {
  const { clients, receipts, updateClientTag } = useApp();
  const formatCOP = (val: number) => "$" + Math.round(val).toLocaleString("es-CO");

  const [searchText, setSearchText] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Search logic
  const enrichedClients = useMemo(() => {
    return clients.map((c) => {
      const actualReceipts = receipts.filter(
        (r) =>
          r.clientName.trim().toLowerCase() === c.name.trim().toLowerCase() &&
          r.clientPhone.trim() === c.phone.trim()
      );
      
      const sortedReceipts = [...actualReceipts].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const lastDate = sortedReceipts.length > 0 ? sortedReceipts[0].date : c.lastPurchaseDate;

      const sortedAscReceipts = [...actualReceipts].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const firstDate = sortedAscReceipts.length > 0 ? sortedAscReceipts[0].date : (c.lastPurchaseDate || "");

      const totalSpent = actualReceipts.reduce((sum, r) => sum + (r.totalCharged || 0), 0);
      const profitGenerated = actualReceipts.reduce((sum, r) => sum + (r.totalProfit || 0), 0);
      const averagePurchase = actualReceipts.length > 0 ? totalSpent / actualReceipts.length : 0;
      const numServicesAcquired = actualReceipts.reduce((sum, r) => sum + (r.services?.length || 0), 0);

      return {
        ...c,
        actualPurchaseCount: actualReceipts.length,
        actualTotalSpent: totalSpent,
        actualLastPurchaseDate: lastDate,
        actualFirstPurchaseDate: firstDate,
        actualProfitGenerated: profitGenerated,
        actualAveragePurchase: averagePurchase,
        actualNumServicesAcquired: numServicesAcquired,
        actualReceipts
      };
    });
  }, [clients, receipts]);

  const filteredClients = useMemo(() => {
    return enrichedClients.filter((c) => {
      if (c.actualPurchaseCount <= 0) return false;
      const search = searchText.toLowerCase().trim();
      return (
        search === "" ||
        c.name.toLowerCase().includes(search) ||
        c.phone.includes(search)
      );
    });
  }, [enrichedClients, searchText]);

  // Find currently selected client object
  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return enrichedClients.find((c) => c.id === selectedClientId) || null;
  }, [enrichedClients, selectedClientId]);

  // Find receipts that belong to the selected client
  const clientReceipts = useMemo(() => {
    if (!selectedClient) return [];
    return selectedClient.actualReceipts;
  }, [selectedClient]);

  // Format date helper
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
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Directorio de Clientes</h2>
        <p className="text-xs text-gray-500 mt-1">Consulte el historial de compras y el total facturado por cada cliente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Clients List */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col h-[600px]">
          {/* Search bar inside list */}
          <div className="p-4 border-b border-gray-150 bg-gray-50/50">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-indigo-500" />
              </div>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar cliente por nombre o teléfono..."
                className="block w-full pl-10 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* List items scrollable container */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredClients.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-xs">
                <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                No se encontraron clientes registrados.
              </div>
            ) : (
              filteredClients.map((client) => {
                const isSelected = selectedClientId === client.id;
                return (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClientId(client.id)}
                    className={`w-full text-left p-4 transition flex items-center justify-between group cursor-pointer ${
                      isSelected ? "bg-indigo-50/60 border-l-4 border-indigo-600" : "hover:bg-gray-50/50"
                    }`}
                  >
                    <div className="space-y-1 pr-4 truncate">
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                        <User className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{client.name}</span>
                        {client.tag && (
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-sm font-extrabold border shrink-0 ${
                            client.tag === "VIP" ? "bg-purple-100 text-purple-800 border-purple-200" :
                            client.tag === "Frecuente" ? "bg-blue-100 text-blue-800 border-blue-200" :
                            client.tag === "Mayorista" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                            "bg-gray-100 text-gray-700 border-gray-200"
                          }`}>
                            {client.tag}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {client.phone}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-gray-900">
                        {formatCOP(client.actualTotalSpent)}
                      </div>
                      <div className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold">
                        {client.actualPurchaseCount} {client.actualPurchaseCount === 1 ? "compra" : "compras"}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Client details and order history */}
        <div className="lg:col-span-7 space-y-6">
          {selectedClient ? (
            <div className="space-y-6">
              {/* Client Profile Box */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">Ficha de Cliente</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-950">{selectedClient.name}</h3>
                      {selectedClient.tag && (
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                          selectedClient.tag === "VIP" ? "bg-purple-100 text-purple-800 border-purple-200" :
                          selectedClient.tag === "Frecuente" ? "bg-blue-100 text-blue-800 border-blue-200" :
                          selectedClient.tag === "Mayorista" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                          "bg-gray-100 text-gray-700 border-gray-200"
                        }`}>
                          {selectedClient.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {selectedClient.phone}
                    </p>
                    
                    {/* Client tag editor select */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Etiqueta:</span>
                      <select
                        value={selectedClient.tag || ""}
                        onChange={async (e) => {
                          const newTag = e.target.value;
                          try {
                            await updateClientTag(selectedClient.id, newTag);
                          } catch (err) {
                            console.error("Error updating client tag:", err);
                          }
                        }}
                        className="text-[11px] font-semibold rounded-md border border-gray-200 bg-white px-2 py-0.5 text-gray-800 focus:outline-hidden cursor-pointer"
                      >
                        <option value="">Sin Etiqueta</option>
                        <option value="VIP">👑 VIP</option>
                        <option value="Frecuente">⭐ Frecuente</option>
                        <option value="Mayorista">💼 Mayorista</option>
                        <option value="Nuevo">🌱 Nuevo</option>
                      </select>
                    </div>
                  </div>
                  <div className="bg-indigo-50 text-indigo-700 rounded-xl p-3 text-center border border-indigo-100/50">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">Total Consumido</div>
                    <div className="text-lg font-bold mt-0.5">{formatCOP(selectedClient.actualTotalSpent)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 border-t border-gray-100 pt-5 text-xs">
                  <div>
                    <span className="text-gray-400 block mb-0.5">Total de Pedidos:</span>
                    <strong className="text-gray-800 font-semibold">{selectedClient.actualPurchaseCount} órdenes</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Total Gastado:</span>
                    <strong className="text-emerald-700 font-bold">{formatCOP(selectedClient.actualTotalSpent)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Ganancia Generada:</span>
                    <strong className="text-indigo-700 font-bold">{formatCOP(selectedClient.actualProfitGenerated)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Primer Pedido:</span>
                    <strong className="text-gray-800 font-mono font-medium">{formatDateSimple(selectedClient.actualFirstPurchaseDate)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Última Compra:</span>
                    <strong className="text-gray-800 font-mono font-medium">{formatDateSimple(selectedClient.actualLastPurchaseDate)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block mb-0.5">Promedio de Compra:</span>
                    <strong className="text-indigo-600 font-semibold">{formatCOP(selectedClient.actualAveragePurchase)}</strong>
                  </div>
                  <div className="col-span-2 sm:col-span-3 border-t border-gray-50 pt-3 flex justify-between items-center text-[11px]">
                    <span className="text-gray-400">Total de servicios adquiridos:</span>
                    <span className="font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                      {selectedClient.actualNumServicesAcquired} {selectedClient.actualNumServicesAcquired === 1 ? "servicio" : "servicios"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Client Receipts History List */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-3">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Historial de Compras de {selectedClient.name}
                </h4>

                {clientReceipts.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-6 text-center">Cargando compras...</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {clientReceipts.map((receipt) => (
                      <div key={receipt.id} className="flex justify-between items-center py-3.5 hover:bg-gray-50/20 transition">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-gray-900">
                            Comprobante #{receipt.consecutive}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateSimple(receipt.date)}
                            <span className="text-gray-200">|</span>
                            <span>{receipt.services.length} {receipt.services.length === 1 ? "servicio" : "servicios"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-indigo-600">
                            {formatCOP(receipt.totalCharged)}
                          </span>
                          <button
                            id={`btn-view-client-receipt-${receipt.consecutive}`}
                            onClick={() => onSelectReceipt(receipt)}
                            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 border border-indigo-200 hover:bg-indigo-50 transition px-2.5 py-1.5 rounded-lg shadow-2xs bg-white cursor-pointer"
                          >
                            Ver
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center h-full flex flex-col justify-center items-center shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <User className="w-12 h-12 text-indigo-200 mb-3" />
              <h3 className="text-sm font-bold text-gray-700">Seleccione un Cliente</h3>
              <p className="text-xs text-gray-400 max-w-sm mt-1 leading-relaxed">
                Seleccione un cliente del listado de la izquierda para ver su historial completo de compras, detalles de contacto y facturación.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
