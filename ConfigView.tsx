/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import {
  Save,
  Plus,
  Trash2,
  Edit2,
  Settings,
  Share2,
  Layers,
  Phone,
  ShieldAlert,
  Sliders,
  Check,
  AlertCircle,
  HelpCircle,
  Instagram,
  Facebook,
  Youtube,
  Twitter,
  Send,
  AtSign,
  Video,
  X,
  PlusCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { BusinessConfig, SocialNetwork, Service, ServiceQuantity } from "../types";
import { motion, AnimatePresence } from "motion/react";

export const ConfigView: React.FC = () => {
  const {
    businessConfig,
    socialNetworks,
    services,
    updateBusinessConfig,
    addSocialNetwork,
    updateSocialNetwork,
    deleteSocialNetwork,
    addService,
    updateService,
    deleteService,
    restoreDefaults
  } = useApp();

  const formatCOP = (val: number) => "$" + Math.round(val).toLocaleString("es-CO");

  // Tab systems or section selectors
  const [activeTab, setActiveTab] = useState<"general" | "services">("general");

  // General Settings state
  const [bName, setBName] = useState(businessConfig.businessName);
  const [bLogoUrl, setBLogoUrl] = useState(businessConfig.logoUrl);
  const [bWhatsapp, setBWhatsapp] = useState(businessConfig.whatsapp);
  const [bWarranty, setBWarranty] = useState(businessConfig.warrantyDays.toString());

  // Message states
  const [generalSuccess, setGeneralSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Social network forms state
  const [editingSnId, setEditingSnId] = useState<string | null>(null);
  const [snNameInput, setSnNameInput] = useState("");
  const [snIconInput, setSnIconInput] = useState("Instagram");
  const [showAddSnForm, setShowAddSnForm] = useState(false);
  const [deletingSnId, setDeletingSnId] = useState<string | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  // Services state
  const [selectedSocialId, setSelectedSocialId] = useState(socialNetworks[0]?.id || "");
  const [showAddServiceForm, setShowAddServiceForm] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");

  // Quantities manager state for currently selected service
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [showAddQtyForm, setShowAddQtyForm] = useState(false);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [qtyValue, setQtyValue] = useState("");
  const [qtyCost, setQtyCost] = useState("");
  const [qtyPrice, setQtyPrice] = useState("");

  // Save General settings
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setGeneralSuccess(false);

    const wDays = parseInt(bWarranty);
    if (isNaN(wDays) || wDays < 0) {
      setGeneralError("La garantía debe ser un número entero de días válido.");
      return;
    }

    try {
      await updateBusinessConfig({
        businessName: bName.trim(),
        logoUrl: bLogoUrl.trim(),
        whatsapp: bWhatsapp.trim(),
        warrantyDays: wDays
      });
      setGeneralSuccess(true);
      setTimeout(() => setGeneralSuccess(false), 3000);
    } catch (err: any) {
      setGeneralError(err.message || "Error al actualizar la configuración general.");
    }
  };

  // Create or Update Social Network
  const handleSaveSocialNetwork = async () => {
    if (!snNameInput.trim()) return;

    const snId = editingSnId || snNameInput.trim().toLowerCase().replace(/\s+/g, "-");
    const newSn: SocialNetwork = {
      id: snId,
      name: snNameInput.trim(),
      icon: snIconInput
    };

    try {
      if (editingSnId) {
        await updateSocialNetwork(newSn);
      } else {
        await addSocialNetwork(newSn);
      }
      setSnNameInput("");
      setEditingSnId(null);
      setShowAddSnForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Social Network
  const handleDeleteSocialNetwork = async (id: string) => {
    if (confirm("¿Está seguro de eliminar esta red social? Esto borrará todos sus servicios y cantidades asociadas.")) {
      try {
        await deleteSocialNetwork(id);
        if (selectedSocialId === id) {
          setSelectedSocialId(socialNetworks.find((sn) => sn.id !== id)?.id || "");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Filtered services for the currently selected social network
  const currentServices = useMemo(() => {
    return services.filter((s) => s.socialNetworkId === selectedSocialId);
  }, [services, selectedSocialId]);

  // Selected service object
  const selectedServiceObj = useMemo(() => {
    return services.find((s) => s.id === selectedServiceId) || null;
  }, [services, selectedServiceId]);

  // Create Service
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim() || !selectedSocialId) return;

    const srvId = `${selectedSocialId}-${newServiceName.trim().toLowerCase().replace(/\s+/g, "-")}`;
    const newSrv: Service = {
      id: srvId,
      socialNetworkId: selectedSocialId,
      name: newServiceName.trim(),
      quantities: []
    };

    try {
      await addService(newSrv);
      setNewServiceName("");
      setShowAddServiceForm(false);
      setSelectedServiceId(srvId); // Select the newly created service
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Service
  const handleDeleteService = async (id: string) => {
    if (confirm("¿Está seguro de eliminar este servicio? Se borrarán sus cantidades asociadas.")) {
      try {
        await deleteService(id);
        if (selectedServiceId === id) {
          setSelectedServiceId(null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Add or Edit Quantity Option to Service
  const handleAddQty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceObj) return;

    const val = parseInt(qtyValue);
    const cost = parseFloat(qtyCost);
    const price = parseFloat(qtyPrice);

    if (isNaN(val) || isNaN(cost) || isNaN(price)) {
      alert("Por favor ingrese valores numéricos válidos.");
      return;
    }

    const oldQty = selectedServiceObj.quantities.find(q => q.id === editingQtyId);
    const activeStatus = oldQty ? oldQty.active : true;

    const newQty: ServiceQuantity = {
      id: editingQtyId || `${selectedServiceObj.id}-q-${val}`,
      quantity: val,
      providerCost: cost,
      suggestedPrice: price,
      active: activeStatus
    };

    let updatedQuantities = [...selectedServiceObj.quantities];

    if (editingQtyId) {
      updatedQuantities = updatedQuantities.map((q) => q.id === editingQtyId ? newQty : q);
    } else {
      // Append to quantities list (prevent duplicates)
      const existingIndex = selectedServiceObj.quantities.findIndex((q) => q.quantity === val);
      if (existingIndex >= 0) {
        updatedQuantities[existingIndex] = newQty;
      } else {
        updatedQuantities.push(newQty);
      }
    }

    // Sort by quantity ascending
    updatedQuantities.sort((a, b) => a.quantity - b.quantity);

    try {
      await updateService({
        ...selectedServiceObj,
        quantities: updatedQuantities
      });
      setQtyValue("");
      setQtyCost("");
      setQtyPrice("");
      setEditingQtyId(null);
      setShowAddQtyForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEditQty = (q: ServiceQuantity) => {
    setEditingQtyId(q.id);
    setQtyValue(q.quantity.toString());
    setQtyCost(q.providerCost.toString());
    setQtyPrice(q.suggestedPrice.toString());
    setShowAddQtyForm(true);
  };

  const handleCancelQtyForm = () => {
    setQtyValue("");
    setQtyCost("");
    setQtyPrice("");
    setEditingQtyId(null);
    setShowAddQtyForm(false);
  };

  // Delete Quantity from Service
  const handleDeleteQty = async (qtyId: string) => {
    if (!selectedServiceObj) return;

    const updatedQuantities = selectedServiceObj.quantities.filter((q) => q.id !== qtyId);

    try {
      await updateService({
        ...selectedServiceObj,
        quantities: updatedQuantities
      });
      if (editingQtyId === qtyId) {
        handleCancelQtyForm();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle active status of a quantity
  const handleToggleQtyActive = async (qtyId: string) => {
    if (!selectedServiceObj) return;

    const updatedQuantities = selectedServiceObj.quantities.map((q) =>
      q.id === qtyId ? { ...q, active: !q.active } : q
    );

    try {
      await updateService({
        ...selectedServiceObj,
        quantities: updatedQuantities
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Render social network icon helper
  const renderSocialIcon = (iconName: string, className = "w-4 h-4") => {
    switch (iconName) {
      case "Instagram":
        return <Instagram className={className} />;
      case "Facebook":
        return <Facebook className={className} />;
      case "Youtube":
        return <Youtube className={className} />;
      case "Twitter":
        return <Twitter className={className} />;
      case "Send":
        return <Send className={className} />;
      case "AtSign":
        return <AtSign className={className} />;
      case "Video":
        return <Video className={className} />;
      default:
        return <Share2 className={className} />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-2">
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Configuración del Sistema</h2>
        <p className="text-xs text-gray-500 mt-1">Configure los datos de contacto del negocio, redes sociales, servicios y costos</p>
      </div>

      {/* Selector Tabs */}
      <div className="flex border-b border-gray-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("general")}
          className={`pb-3 border-b-2 px-1 transition cursor-pointer ${
            activeTab === "general"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          General y Redes
        </button>
        <button
          onClick={() => {
            setActiveTab("services");
            if (socialNetworks.length > 0 && !selectedSocialId) {
              setSelectedSocialId(socialNetworks[0].id);
            }
          }}
          className={`pb-3 border-b-2 px-1 transition cursor-pointer ${
            activeTab === "services"
              ? "border-indigo-600 text-indigo-600 font-bold"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          Servicios y Precios
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tab 1: General Settings & Social Networks */}
        {activeTab === "general" && (
          <>
            {/* General Info Column */}
            <div className="lg:col-span-5 space-y-6">
              <form onSubmit={handleSaveGeneral} className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100">
                  <Settings className="w-4 h-4 text-indigo-500" />
                  Información del Negocio
                </h3>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase">Nombre del Negocio</label>
                  <input
                    type="text"
                    required
                    value={bName}
                    onChange={(e) => setBName(e.target.value)}
                    placeholder="Ej. ImpulsaNet"
                    className="mt-1 block w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase">Enlace del Logo (Opcional)</label>
                  <input
                    type="text"
                    value={bLogoUrl}
                    onChange={(e) => setBLogoUrl(e.target.value)}
                    placeholder="Dejar vacío para usar texto predeterminado"
                    className="mt-1 block w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase">WhatsApp de Soporte</label>
                  <div className="mt-1 relative rounded-md shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      required
                      value={bWhatsapp}
                      onChange={(e) => setBWhatsapp(e.target.value)}
                      placeholder="+506 8888 8888"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 uppercase">Garantía Predeterminada (Días)</label>
                  <div className="mt-1 relative rounded-md shadow-2xs">
                    <input
                      type="number"
                      required
                      value={bWarranty}
                      onChange={(e) => setBWarranty(e.target.value)}
                      placeholder="30"
                      className="block w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Este número se convertirá automáticamente en el texto "30 días" del comprobante.</p>
                </div>

                {generalError && (
                  <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-2 text-xs text-red-600">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{generalError}</span>
                  </div>
                )}

                {generalSuccess && (
                  <div className="bg-indigo-50 border border-indigo-150 p-3 rounded-lg flex items-center gap-1.5 text-xs text-indigo-750">
                    <Check className="w-4 h-4 text-indigo-600" />
                    <span>Cambios guardados con éxito en Firebase.</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Guardar Información
                </button>
              </form>

              {/* Restore Defaults Block */}
              <div className="bg-red-50/40 border border-red-100 rounded-xl p-5 space-y-3.5">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-850">Zona de Restauración</h4>
                    <p className="text-[10.5px] text-gray-500 mt-0.5 leading-relaxed">
                      ¿Has eliminado alguna red social (como Facebook) o modificado precios por error? Haz clic abajo para restaurar todos los valores predeterminados del sistema de venta.
                    </p>
                  </div>
                </div>
                
                {showRestoreConfirm ? (
                  <div className="space-y-2 p-3 bg-red-100/50 border border-red-200 rounded-lg animate-fade-in text-xs">
                    <p className="font-bold text-red-800 text-[10.5px] leading-snug">
                      ¿Estás totalmente seguro de restablecer todas las redes, servicios y precios? Esto borrará tus cambios.
                    </p>
                    <div className="flex gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await restoreDefaults();
                            setShowRestoreConfirm(false);
                            window.location.reload();
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white rounded text-[10.5px] font-bold cursor-pointer transition text-center"
                      >
                        Sí, Restablecer Todo
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRestoreConfirm(false)}
                        className="flex-1 py-1.5 px-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded text-[10.5px] font-semibold cursor-pointer transition text-center"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRestoreConfirm(true)}
                    className="w-full flex justify-center items-center py-2 px-4 border border-red-200 rounded-lg text-xs font-bold text-red-700 bg-white hover:bg-red-50 transition cursor-pointer shadow-2xs"
                  >
                    Restaurar Redes y Precios de Fábrica
                  </button>
                )}
              </div>
            </div>

            {/* Social Networks Admin Column */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-indigo-500" />
                  Redes Sociales de Venta
                </h3>
                <button
                  onClick={() => {
                    setEditingSnId(null);
                    setSnNameInput("");
                    setSnIconInput("Instagram");
                    setShowAddSnForm(!showAddSnForm);
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Red
                </button>
              </div>

              {/* Collapsible form to create/edit social networks */}
              <AnimatePresence>
                {showAddSnForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-150 space-y-3 overflow-hidden"
                  >
                    <h4 className="text-xs font-bold text-gray-700">
                      {editingSnId ? "Editar Red Social" : "Nueva Red Social"}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase">Nombre</label>
                        <input
                          type="text"
                          value={snNameInput}
                          onChange={(e) => setSnNameInput(e.target.value)}
                          placeholder="Ej. Instagram"
                          className="mt-1 block w-full px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 uppercase">Icono</label>
                        <select
                          value={snIconInput}
                          onChange={(e) => setSnIconInput(e.target.value)}
                          className="mt-1 block w-full px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                        >
                          <option value="Instagram">Instagram</option>
                          <option value="Facebook">Facebook</option>
                          <option value="Youtube">Youtube</option>
                          <option value="Twitter">X (Twitter)</option>
                          <option value="Send">Telegram</option>
                          <option value="AtSign">Threads</option>
                          <option value="Video">TikTok</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 text-xs pt-1">
                      <button
                        onClick={() => setShowAddSnForm(false)}
                        className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-100 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveSocialNetwork}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition cursor-pointer"
                      >
                        {editingSnId ? "Actualizar" : "Crear"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Social Networks List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {socialNetworks.map((sn) => (
                  <div
                    key={sn.id}
                    className="p-4 border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-50/40 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100/50">
                        {renderSocialIcon(sn.icon)}
                      </div>
                      <span className="text-xs font-semibold text-gray-900">{sn.name}</span>
                    </div>

                     {deletingSnId === sn.id ? (
                      <div className="flex items-center gap-1.5 animate-fade-in bg-red-50 p-1.5 rounded-lg border border-red-100">
                        <span className="text-[9px] font-bold text-red-600 uppercase">¿Borrar?</span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await deleteSocialNetwork(sn.id);
                              if (selectedSocialId === sn.id) {
                                setSelectedSocialId(socialNetworks.find((s) => s.id !== sn.id)?.id || "");
                              }
                            } catch (err) {
                              console.error(err);
                            } finally {
                              setDeletingSnId(null);
                            }
                          }}
                          className="bg-red-650 hover:bg-red-700 text-white text-[10px] px-2 py-0.5 rounded font-bold cursor-pointer transition"
                        >
                          Sí
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSnId(null)}
                          className="bg-white border border-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded font-bold cursor-pointer transition"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSnId(sn.id);
                            setSnNameInput(sn.name);
                            setSnIconInput(sn.icon);
                            setShowAddSnForm(true);
                          }}
                          className="text-gray-400 hover:text-indigo-600 p-1 hover:bg-gray-100 rounded-md transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSnId(sn.id)}
                          className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-md transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Services, Quantities & Prices Manager */}
        {activeTab === "services" && (
          <>
            {/* Left selector sidebar (Services) */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4 h-[550px] flex flex-col justify-between animate-fade-in">
              <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                {/* Select Social Network */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Red Activa</label>
                  <select
                    value={selectedSocialId}
                    onChange={(e) => {
                      setSelectedSocialId(e.target.value);
                      setSelectedServiceId(null);
                    }}
                    className="mt-1 block w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                  >
                    {socialNetworks.map((sn) => (
                      <option key={sn.id} value={sn.id}>
                        {sn.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-gray-150 pt-3 flex-1 flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Servicios de la Red</span>
                    <button
                      onClick={() => setShowAddServiceForm(!showAddServiceForm)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Nuevo
                    </button>
                  </div>

                  {/* Form to create service */}
                  <AnimatePresence>
                    {showAddServiceForm && (
                      <motion.form
                        onSubmit={handleAddService}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gray-50 rounded-xl p-3 border border-gray-150 space-y-2 mb-3 overflow-hidden text-xs"
                      >
                        <input
                          type="text"
                          required
                          value={newServiceName}
                          onChange={(e) => setNewServiceName(e.target.value)}
                          placeholder="Ej. Seguidores, Likes, etc."
                          className="w-full px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                        />
                        <div className="flex justify-end gap-1.5 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setShowAddServiceForm(false)}
                            className="px-2.5 py-1 border border-gray-200 rounded bg-white hover:bg-gray-50 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            className="px-2.5 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer"
                          >
                            Crear
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>

                  {/* Services List scrollable */}
                  <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                    {currentServices.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 italic text-xs">
                        No hay servicios definidos para esta red social.
                      </div>
                    ) : (
                      currentServices.map((srv) => {
                        const isSelected = selectedServiceId === srv.id;
                        return (
                          <div
                            key={srv.id}
                            className={`w-full flex items-center justify-between rounded-lg p-2 text-xs transition ${
                              isSelected ? "bg-indigo-50/60 border-l-4 border-indigo-600 font-semibold text-indigo-700" : "hover:bg-gray-50/50 text-gray-600"
                            }`}
                          >
                            <button
                              onClick={() => setSelectedServiceId(srv.id)}
                              className="flex-1 text-left py-1 cursor-pointer"
                            >
                              {srv.name}
                            </button>
                            {deletingServiceId === srv.id ? (
                              <div className="flex items-center gap-1 bg-red-50 p-1 rounded-md border border-red-100 shrink-0 animate-fade-in">
                                <span className="text-[8px] font-bold text-red-600 uppercase">¿Borrar?</span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await deleteService(srv.id);
                                      if (selectedServiceId === srv.id) {
                                        setSelectedServiceId(null);
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    } finally {
                                      setDeletingServiceId(null);
                                    }
                                  }}
                                  className="bg-red-650 hover:bg-red-700 text-white text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition"
                                >
                                  Sí
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingServiceId(null)}
                                  className="bg-white border border-gray-200 text-gray-700 text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingServiceId(srv.id)}
                                className="text-gray-400 hover:text-red-600 p-1 rounded-md transition shrink-0 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right details board (Quantities, Provider Cost and Suggested Price list) */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] min-h-[550px] flex flex-col justify-between animate-fade-in">
              {selectedServiceObj ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                      <div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Configurador de Cantidades</span>
                        <h3 className="text-sm font-bold text-gray-900">
                          {selectedServiceObj.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => {
                          handleCancelQtyForm();
                          setShowAddQtyForm(!showAddQtyForm);
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100/50 hover:bg-indigo-100 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Nueva Cantidad
                      </button>
                    </div>

                    {/* Collapsible Add/Edit Quantity Option Form */}
                    <AnimatePresence>
                      {showAddQtyForm && (
                        <motion.form
                          onSubmit={handleAddQty}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-indigo-50/20 rounded-xl p-4 border border-indigo-100/30 space-y-3 overflow-hidden text-xs"
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-indigo-100/20">
                            <h4 className="font-bold text-indigo-800 flex items-center gap-1">
                              {editingQtyId ? <Edit2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                              {editingQtyId ? "Editar Opción de Cantidad" : "Nueva Opción de Cantidad"}
                            </h4>
                            {editingQtyId && (
                              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[9px] font-bold">Modo Edición</span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase">Cantidad</label>
                              <input
                                type="number"
                                required
                                value={qtyValue}
                                onChange={(e) => setQtyValue(e.target.value)}
                                placeholder="Ej. 1000"
                                className="mt-1 block w-full px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase">Costo Proveedor (COP)</label>
                              <input
                                type="number"
                                required
                                value={qtyCost}
                                onChange={(e) => setQtyCost(e.target.value)}
                                placeholder="Ej. 6000"
                                className="mt-1 block w-full px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-500 uppercase">Precio Sugerido (COP)</label>
                              <input
                                type="number"
                                required
                                value={qtyPrice}
                                onChange={(e) => setQtyPrice(e.target.value)}
                                placeholder="Ej. 15000"
                                className="mt-1 block w-full px-2.5 py-1.5 border border-gray-200 rounded-lg bg-white font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 text-[10px] pt-1">
                            <button
                              type="button"
                              onClick={handleCancelQtyForm}
                              className="px-3 py-1 border border-gray-200 rounded-md bg-white hover:bg-gray-100 cursor-pointer text-gray-600 font-medium"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer font-semibold shadow-2xs"
                            >
                              {editingQtyId ? "Guardar Cambios" : "Guardar Opción"}
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    {/* Table of Quantities */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <th className="py-3 px-4">Cantidad</th>
                            <th className="py-3 px-4 text-right">Costo Proveedor</th>
                            <th className="py-3 px-4 text-right">Precio Sugerido</th>
                            <th className="py-3 px-4 text-center">Estado</th>
                            <th className="py-3 px-4 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-xs bg-white">
                          {selectedServiceObj.quantities.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-gray-400 italic">
                                No se han configurado cantidades para este servicio aún.
                              </td>
                            </tr>
                          ) : (
                            selectedServiceObj.quantities.map((q) => (
                              <tr key={q.id} className="hover:bg-gray-50/20 transition">
                                <td className="py-3 px-4 font-mono font-semibold text-gray-900">
                                  {q.quantity.toLocaleString()}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-medium text-gray-700">
                                  {formatCOP(q.providerCost)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                                  {formatCOP(q.suggestedPrice)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button
                                    id={`btn-toggle-active-${q.id}`}
                                    onClick={() => handleToggleQtyActive(q.id)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer transition ${
                                      q.active
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                        : "bg-gray-50 text-gray-400 border-gray-200"
                                    }`}
                                  >
                                    {q.active ? "Activo" : "Inactivo"}
                                  </button>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      id={`btn-edit-qty-${q.id}`}
                                      onClick={() => handleStartEditQty(q)}
                                      className="text-indigo-600 hover:text-indigo-800 p-1 hover:bg-indigo-50 rounded-md transition cursor-pointer"
                                      title="Editar"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      id={`btn-delete-qty-${q.id}`}
                                      onClick={() => handleDeleteQty(q.id)}
                                      className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-md transition cursor-pointer"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center h-full flex flex-col justify-center items-center">
                  <Sliders className="w-12 h-12 text-indigo-300 mb-3" />
                  <h3 className="text-sm font-semibold text-gray-700">Seleccione un Servicio</h3>
                  <p className="text-xs text-gray-400 max-w-sm mt-1 leading-relaxed">
                    Seleccione un servicio del panel izquierdo para configurar sus ofertas, cantidades, costo interno del proveedor y sugerido de venta.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
