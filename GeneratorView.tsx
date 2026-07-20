/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import {
  Plus,
  Trash2,
  FileText,
  DollarSign,
  Briefcase,
  Layers,
  HelpCircle,
  TrendingUp,
  Eye,
  EyeOff,
  User,
  Phone,
  Hash,
  AlertCircle,
  PlusCircle,
  Sparkles
} from "lucide-react";
import { ReceiptItem, Receipt } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface GeneratorViewProps {
  onReceiptGenerated: (receipt: Receipt) => void;
}

export const GeneratorView: React.FC<GeneratorViewProps> = ({ onReceiptGenerated }) => {
  const { socialNetworks, services, createReceipt, businessConfig } = useApp();
  const formatCOP = (val: number) => "$" + Math.round(val).toLocaleString("es-CO");

  // Client info state
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Current adding item state
  const [selectedSocialId, setSelectedSocialId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedQtyId, setSelectedQtyId] = useState("");
  const [customOrderId, setCustomOrderId] = useState("");
  const [customOrderId2, setCustomOrderId2] = useState("");
  const [idCountType, setIdCountType] = useState<"uno" | "dos">("uno");
  const [customChargedPrice, setCustomChargedPrice] = useState("");
  const [status, setStatus] = useState<"en_proceso" | "completado" | "garantia_en_proceso" | "cancelado">("en_proceso");
  const [internalNotes, setInternalNotes] = useState("");

  // Receipt items array
  const [addedItems, setAddedItems] = useState<ReceiptItem[]>([]);

  // Toggle for hiding admin data (sensitive provider cost/profit)
  const [hideAdminData, setHideAdminData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered lists for adding form
  const availableServices = useMemo(() => {
    return services.filter((s) => s.socialNetworkId === selectedSocialId);
  }, [services, selectedSocialId]);

  const activeQuantities = useMemo(() => {
    const srv = services.find((s) => s.id === selectedServiceId);
    return srv ? srv.quantities.filter((q) => q.active !== false) : [];
  }, [services, selectedServiceId]);

  const selectedQuantityObj = useMemo(() => {
    return activeQuantities.find((q) => q.id === selectedQtyId);
  }, [activeQuantities, selectedQtyId]);

  // Auto-fill suggested price when quantity changes
  useEffect(() => {
    if (selectedQuantityObj) {
      setCustomChargedPrice(selectedQuantityObj.suggestedPrice.toString());
    } else {
      setCustomChargedPrice("");
    }
  }, [selectedQuantityObj]);

  // Reset service and quantity fields when social network changes
  useEffect(() => {
    setSelectedServiceId("");
    setSelectedQtyId("");
  }, [selectedSocialId]);

  // Reset quantity fields when service changes
  useEffect(() => {
    setSelectedQtyId("");
  }, [selectedServiceId]);

  // Totals calculations
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalCharged = 0;
    let totalProviderCost = 0;

    addedItems.forEach((item) => {
      subtotal += item.suggestedPrice;
      totalCharged += item.chargedPrice;
      totalProviderCost += item.providerCostAtPurchase;
    });

    const totalProfit = totalCharged - totalProviderCost;

    return {
      subtotal,
      totalCharged,
      totalProviderCost,
      totalProfit,
    };
  }, [addedItems]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedSocialId || !selectedServiceId || !selectedQtyId) {
      setError("Por favor complete los selectores de Red Social, Servicio y Cantidad.");
      return;
    }

    const sn = socialNetworks.find((s) => s.id === selectedSocialId);
    const srv = services.find((s) => s.id === selectedServiceId);
    const qty = activeQuantities.find((q) => q.id === selectedQtyId);

    if (!sn || !srv || !qty) {
      setError("Error cargando la configuración del servicio seleccionado.");
      return;
    }

    const chargedPrice = parseFloat(customChargedPrice);
    if (isNaN(chargedPrice) || chargedPrice < 0) {
      setError("Por favor ingrese un precio cobrado válido.");
      return;
    }

    const orderId1 = customOrderId.trim() || `PED-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderId2 = idCountType === "dos" ? (customOrderId2.trim() || `PED-${Math.floor(100000 + Math.random() * 900000)}`) : "";
    
    const finalOrderIds = idCountType === "dos" ? [orderId1, orderId2] : [orderId1];

    const newItem: ReceiptItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      socialNetworkId: sn.id,
      socialNetworkName: sn.name,
      serviceId: srv.id,
      serviceName: srv.name,
      quantity: qty.quantity,
      suggestedPrice: qty.suggestedPrice,
      chargedPrice: chargedPrice,
      providerCostAtPurchase: qty.providerCost,
      orderId: orderId1,
      orderIds: finalOrderIds,
    };

    setAddedItems((prev) => [...prev, newItem]);

    // Reset selector inputs
    setSelectedQtyId("");
    setCustomOrderId("");
    setCustomOrderId2("");
    setCustomChargedPrice("");
  };

  const handleRemoveItem = (id: string) => {
    setAddedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItemChargedPrice = (id: string, priceStr: string) => {
    const price = parseFloat(priceStr);
    if (isNaN(price)) return;
    setAddedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, chargedPrice: price } : item))
    );
  };

  const handleUpdateItemOrderId = (id: string, orderId: string) => {
    setAddedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, orderId: orderId } : item))
    );
  };

  const handleEmitReceipt = async () => {
    setError(null);

    if (!clientName.trim()) {
      setError("Por favor ingrese el nombre del cliente.");
      return;
    }

    if (!clientPhone.trim()) {
      setError("Por favor ingrese el teléfono de contacto del cliente.");
      return;
    }

    if (addedItems.length === 0) {
      setError("Debe agregar al menos un servicio al comprobante.");
      return;
    }

    setIsSubmitting(true);

    try {
      const receiptData = {
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        date: new Date().toISOString(),
        services: addedItems,
        subtotal: totals.subtotal,
        totalCharged: totals.totalCharged,
        totalProviderCost: totals.totalProviderCost,
        totalProfit: totals.totalProfit,
        warranty: `${businessConfig.warrantyDays} días`,
        thankYouMessage: "¡Gracias por confiar en ImpulsaNet para potenciar sus redes!",
        status: status,
        internalNotes: internalNotes.trim(),
      };

      const result = await createReceipt(receiptData);
      
      // Notify parent to open receipt modal
      onReceiptGenerated(result);

      // Reset form entirely
      setClientName("");
      setClientPhone("");
      setAddedItems([]);
      setStatus("en_proceso");
      setInternalNotes("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "No se pudo emitir el comprobante en Firebase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Emisión de Comprobantes</h2>
          <p className="text-xs text-gray-500 mt-1">Cree una cotización o comprobante de compra para un cliente</p>
        </div>
        <button
          id="btn-toggle-admin-data"
          onClick={() => setHideAdminData(!hideAdminData)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-50 border border-gray-100 rounded-lg px-3.5 py-2 shadow-2xs transition shrink-0"
        >
          {hideAdminData ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {hideAdminData ? "Mostrar Costos / Ganancias" : "Ocultar Costos / Ganancias"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Client & Adding Services Form */}
        <div className="lg:col-span-5 space-y-6">
          {/* Client Details Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-500" />
              Información del Cliente
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase">Nombre Completo</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="mt-1 block w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase">Teléfono / WhatsApp</label>
                <input
                  type="text"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Ej. +506 8888 8888"
                  className="mt-1 block w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Control Interno (Uso Administrativo) Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-500" />
              Control Interno (Uso Administrativo)
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase">Estado del Pedido</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="mt-1 block w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="garantia_solicitada">Garantía Solicitada</option>
                  <option value="garantia_finalizada">Garantía Finalizada</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase">Notas Privadas (Opcional)</label>
                <textarea
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Ej. Cliente pidió dividir en dos publicaciones. No enviar antes de las 8 PM."
                  rows={2}
                  className="mt-1 block w-full px-3.5 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition resize-none"
                />
              </div>
            </div>
          </div>

          {/* Selector Form for Adding Service */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <PlusCircle className="w-4 h-4 text-indigo-500" />
              Agregar Servicio al Borrador
            </h3>

            <form onSubmit={handleAddItem} className="space-y-4">
              {/* Select Social Network */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase">Red Social</label>
                <select
                  value={selectedSocialId}
                  onChange={(e) => setSelectedSocialId(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                >
                  <option value="">-- Seleccionar Red Social --</option>
                  {socialNetworks.map((sn) => (
                    <option key={sn.id} value={sn.id}>
                      {sn.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Service Type */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase">Tipo de Servicio</label>
                <select
                  value={selectedServiceId}
                  disabled={!selectedSocialId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                >
                  <option value="">-- Seleccionar Servicio --</option>
                  {availableServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Quantity */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase">Cantidad</label>
                <select
                  value={selectedQtyId}
                  disabled={!selectedServiceId}
                  onChange={(e) => setSelectedQtyId(e.target.value)}
                  className="mt-1 block w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                >
                  <option value="">-- Seleccionar Cantidad --</option>
                  {activeQuantities.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quantity.toLocaleString()} {selectedQuantityObj?.id === q.id ? `(Sugerido: ${formatCOP(q.suggestedPrice)})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Input for Custom Charged Price, ID Count Option, and Dynamic Order IDs */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase">Precio Cobrado (COP)</label>
                  <div className="mt-1 relative rounded-md shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <span className="text-xs font-mono text-gray-400">$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      disabled={!selectedQtyId}
                      value={customChargedPrice}
                      onChange={(e) => setCustomChargedPrice(e.target.value)}
                      placeholder="0.00"
                      className="block w-full pl-6 pr-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1.5">Cantidad de IDs del Pedido</label>
                  <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="idCountType"
                        value="uno"
                        disabled={!selectedQtyId}
                        checked={idCountType === "uno"}
                        onChange={() => {
                          setIdCountType("uno");
                          setCustomOrderId2("");
                        }}
                        className="text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                      />
                      <span>Un ID</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="idCountType"
                        value="dos"
                        disabled={!selectedQtyId}
                        checked={idCountType === "dos"}
                        onChange={() => setIdCountType("dos")}
                        className="text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                      />
                      <span>Dos IDs</span>
                    </label>
                  </div>
                </div>

                {idCountType === "uno" ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 uppercase">ID del Pedido (Opcional)</label>
                    <input
                      type="text"
                      disabled={!selectedQtyId}
                      value={customOrderId}
                      onChange={(e) => setCustomOrderId(e.target.value)}
                      placeholder="Auto-generar"
                      className="mt-1 block w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 uppercase font-mono">ID 1 (Opcional)</label>
                      <input
                        type="text"
                        disabled={!selectedQtyId}
                        value={customOrderId}
                        onChange={(e) => setCustomOrderId(e.target.value)}
                        placeholder="Auto-generar"
                        className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white disabled:bg-gray-50 disabled:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 uppercase font-mono">ID 2 (Opcional)</label>
                      <input
                        type="text"
                        disabled={!selectedQtyId}
                        value={customOrderId2}
                        onChange={(e) => setCustomOrderId2(e.target.value)}
                        placeholder="Auto-generar"
                        className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white disabled:bg-gray-50 disabled:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!selectedQtyId}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden disabled:opacity-40 transition mt-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Agregar al Comprobante
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Receipt Layout and draft preview */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
          {/* Invoice draft board */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-sm font-bold text-gray-950">Borrador de Comprobante</h3>
                </div>
                <div className="text-xs font-mono font-bold bg-indigo-50/50 text-indigo-700 px-2.5 py-1 rounded-md border border-indigo-100/50">
                  ImpulsaNet S.A.
                </div>
              </div>

              {/* Draft Customer Card */}
              {clientName ? (
                <div className="bg-gray-50/50 rounded-xl p-3.5 border border-gray-100 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-gray-400 font-medium">Cliente:</span>
                    <strong className="text-gray-800 ml-1.5">{clientName}</strong>
                  </div>
                  {clientPhone && (
                    <div>
                      <span className="text-gray-400 font-medium">Teléfono:</span>
                      <strong className="text-gray-750 ml-1.5 font-mono">{clientPhone}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-50/30 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                  Complete los datos del cliente a la izquierda.
                </div>
              )}

              {/* Added items list */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                  Servicios Incluidos ({addedItems.length})
                </div>

                {addedItems.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50/30 rounded-xl border border-dashed border-gray-200 text-xs text-gray-400">
                    Aún no ha agregado servicios al borrador del comprobante.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                    {addedItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 hover:bg-gray-50/50 transition">
                        <div className="space-y-1 pr-3 max-w-sm">
                          <div className="text-xs font-bold text-gray-900">
                            {item.socialNetworkName} - {item.serviceName}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-gray-400">
                            <span>Cant: {item.quantity.toLocaleString()}</span>
                            <span>Sugerido: {formatCOP(item.suggestedPrice)}</span>
                            {!hideAdminData && (
                              <span className="text-indigo-600 font-semibold bg-indigo-50 px-1 rounded-sm">Costo Prov: {formatCOP(item.providerCostAtPurchase)}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Inline editable charged price */}
                          <div className="w-24">
                            <label className="sr-only">Cobrado</label>
                            <div className="relative rounded-md shadow-2xs">
                              <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-[10px] text-gray-400 font-mono">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.chargedPrice}
                                onChange={(e) => handleUpdateItemChargedPrice(item.id, e.target.value)}
                                className="block w-full pl-5 pr-1.5 py-1 text-xs border border-gray-200 rounded-md bg-white focus:outline-hidden text-right font-mono font-medium text-gray-900"
                              />
                            </div>
                          </div>

                          {/* Inline editable order ID */}
                          <div className="w-24">
                            <input
                              type="text"
                              value={item.orderId}
                              placeholder="ID Pedido"
                              onChange={(e) => handleUpdateItemOrderId(item.id, e.target.value)}
                              className="block w-full px-2 py-1 text-[10px] border border-gray-200 rounded-md bg-white focus:outline-hidden font-mono text-gray-700"
                            />
                          </div>

                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-md transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Calculations and Emit Button */}
            <div className="pt-6 border-t border-gray-100 mt-6 space-y-4">
              <div className="bg-gray-50/80 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Subtotal sugerido</span>
                  <span className="font-mono">{formatCOP(totals.subtotal)}</span>
                </div>

                <div className="flex justify-between items-center text-sm font-bold text-gray-950 pt-1.5 border-t border-gray-150">
                  <span>Total Cobrado al Cliente</span>
                  <span className="font-mono text-base text-indigo-600 font-bold">{formatCOP(totals.totalCharged)}</span>
                </div>

                {/* Administrative Stats (Show/Hide) */}
                {!hideAdminData && addedItems.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-dashed border-gray-200 grid grid-cols-2 gap-4 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                      <span className="text-gray-400 uppercase tracking-wider text-[9px] font-bold">Costo del Proveedor</span>
                      <div className="font-mono text-gray-700 font-semibold mt-0.5">{formatCOP(totals.totalProviderCost)}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-gray-200">
                      <span className="text-gray-400 uppercase tracking-wider text-[9px] font-bold">Ganancia Neta</span>
                      <div className="font-mono text-indigo-600 font-bold mt-0.5">{formatCOP(totals.totalProfit)}</div>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-2 text-xs text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                id="btn-emit-receipt"
                onClick={handleEmitReceipt}
                disabled={isSubmitting || addedItems.length === 0}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden disabled:opacity-50 transition cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1">
                    Emitiendo...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                    Emitir Comprobante de Pago
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
