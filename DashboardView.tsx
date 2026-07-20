/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import { useApp } from "../context/AppContext";
import {
  TrendingUp,
  DollarSign,
  FileText,
  Users,
  Award,
  Calendar,
  Layers,
  ArrowUpRight,
  Target,
  AlertTriangle,
  CheckCircle2,
  Bell,
  ShieldCheck,
  Percent,
  ChevronRight,
  Sparkles,
  Search,
  BadgeAlert
} from "lucide-react";
import { Receipt, getNormalizedStatus } from "../types";
import { motion } from "motion/react";

interface DashboardViewProps {
  onViewChange: (view: string) => void;
  onSelectReceipt?: (receipt: Receipt) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onViewChange, onSelectReceipt }) => {
  const { receipts, clients, services } = useApp();
  const formatCOP = (val: number) => "$" + Math.round(val).toLocaleString("es-CO");

  // Helper dates & metrics
  const stats = useMemo(() => {
    const now = new Date();
    // Generate local YYYY-MM-DD string
    const localOffset = now.getTimezoneOffset() * 60000;
    const localISO = new Date(now.getTime() - localOffset).toISOString();
    const todayStr = localISO.split("T")[0];
    
    let ordersToday = 0;
    let ordersWeek = 0;
    let ordersMonth = 0;

    let dailySales = 0;
    let weeklySales = 0;
    let monthlySales = 0;
    let dailyProfit = 0;
    let weeklyProfit = 0;
    let monthlyProfit = 0;

    // Weekly date boundary (7 days ago)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Counts of orders by state
    let countEnProceso = 0;
    let countCompletado = 0;
    let countGarantiaEnProceso = 0;
    let countCancelado = 0;

    // Counts of warranties by status
    let countWarrantyActive = 0;
    let countWarrantySoon = 0;
    let countWarrantyExpired = 0;

    receipts.forEach((r) => {
      const rDate = new Date(r.date);
      const isToday = r.date.startsWith(todayStr);
      const isThisMonth = rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear;
      const isWithinWeek = rDate >= sevenDaysAgo;

      const normStatus = getNormalizedStatus(r.status);

      // Status counts
      if (normStatus === "en_proceso") countEnProceso++;
      else if (normStatus === "completado") countCompletado++;
      else if (normStatus === "garantia_en_proceso") countGarantiaEnProceso++;
      else if (normStatus === "cancelado") countCancelado++;

      // Warranty counts (only if status is not canceled)
      if (normStatus !== "cancelado") {
        const daysStr = r.warranty || "30 días";
        const daysMatch = daysStr.match(/\d+/);
        const days = daysMatch ? parseInt(daysMatch[0], 10) : 30;
        
        const purchaseDate = new Date(r.date);
        const expirationDate = new Date(purchaseDate.getTime() + days * 24 * 60 * 60 * 1000);
        const msRemaining = expirationDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 0) {
          countWarrantyExpired++;
        } else if (daysRemaining <= 7) {
          countWarrantySoon++;
        } else {
          countWarrantyActive++;
        }
      }

      if (isToday) {
        ordersToday++;
        dailySales += r.totalCharged || 0;
        dailyProfit += r.totalProfit || 0;
      }
      if (isWithinWeek) {
        ordersWeek++;
        weeklySales += r.totalCharged || 0;
        weeklyProfit += r.totalProfit || 0;
      }
      if (isThisMonth) {
        ordersMonth++;
        monthlySales += r.totalCharged || 0;
        monthlyProfit += r.totalProfit || 0;
      }
    });

    // Best-selling services aggregator
    const serviceSales: Record<string, { name: string; quantity: number; total: number }> = {};
    const socialSales: Record<string, { name: string; total: number }> = {};

    receipts.forEach((r) => {
      r.services.forEach((item) => {
        const sKey = `${item.socialNetworkName} - ${item.serviceName}`;
        if (!serviceSales[sKey]) {
          serviceSales[sKey] = { name: sKey, quantity: 0, total: 0 };
        }
        serviceSales[sKey].quantity += item.quantity;
        serviceSales[sKey].total += item.chargedPrice || 0;

        const snName = item.socialNetworkName;
        if (!socialSales[snName]) {
          socialSales[snName] = { name: snName, total: 0 };
        }
        socialSales[snName].total += item.chargedPrice || 0;
      });
    });

    const topServices = Object.values(serviceSales)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const topSocials = Object.values(socialSales)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Calculate New, Recurrent and VIP clients
    let newClientsCount = 0;
    let recurrentClientsCount = 0;

    const clientAgg: Record<string, { name: string; phone: string; spent: number; count: number; tag?: string }> = {};

    clients.forEach((c) => {
      const actualReceipts = receipts.filter(
        (r) =>
          r.clientName.trim().toLowerCase() === c.name.trim().toLowerCase() &&
          r.clientPhone.trim() === c.phone.trim()
      );

      const totalSpent = actualReceipts.reduce((sum, r) => sum + (r.totalCharged || 0), 0);

      if (actualReceipts.length === 1) {
        newClientsCount++;
      } else if (actualReceipts.length > 1) {
        recurrentClientsCount++;
      }

      if (actualReceipts.length > 0) {
        clientAgg[c.id] = {
          name: c.name,
          phone: c.phone,
          spent: totalSpent,
          count: actualReceipts.length,
          tag: c.tag
        };
      }
    });

    const topClients = Object.values(clientAgg)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);

    // Ticket values
    const totalSalesSum = receipts.reduce((sum, r) => sum + (r.totalCharged || 0), 0);
    const totalProfitSum = receipts.reduce((sum, r) => sum + (r.totalProfit || 0), 0);
    
    const averageSale = receipts.length > 0 ? totalSalesSum / receipts.length : 0;
    const averageProfit = receipts.length > 0 ? totalProfitSum / receipts.length : 0;

    return {
      ordersToday,
      ordersWeek,
      ordersMonth,
      dailySales,
      weeklySales,
      monthlySales,
      dailyProfit,
      weeklyProfit,
      monthlyProfit,
      receiptsCount: receipts.length,
      clientsCount: clients.length,
      topServices,
      topSocials,
      newClientsCount,
      recurrentClientsCount,
      averageSale,
      averageProfit,
      countEnProceso,
      countCompletado,
      countGarantiaEnProceso,
      countCancelado,
      countWarrantyActive,
      countWarrantySoon,
      countWarrantyExpired,
      topClients
    };
  }, [receipts, clients]);

  // Dynamic Alerts engine
  const activeAlerts = useMemo(() => {
    const list: Array<{
      id: string;
      type: "garantia_en_proceso" | "garantia_proxima" | "compra_vip";
      title: string;
      description: string;
      date: string;
      consecutive: number;
      receipt: Receipt;
    }> = [];

    const now = new Date();

    receipts.forEach((r) => {
      const status = getNormalizedStatus(r.status);
      
      // 1. Warranty in process
      if (status === "garantia_en_proceso") {
        list.push({
          id: `${r.id}-garantia-proc`,
          type: "garantia_en_proceso",
          title: "🟡 Garantía en proceso",
          description: `El pedido #${r.consecutive} de ${r.clientName} está en proceso de garantía con el proveedor.`,
          date: r.date,
          consecutive: r.consecutive,
          receipt: r
        });
      }

      // 2. Warranty soon to expire (only if order is not completed or canceled)
      if (status !== "cancelado" && status !== "completado") {
        const daysStr = r.warranty || "30 días";
        const daysMatch = daysStr.match(/\d+/);
        const days = daysMatch ? parseInt(daysMatch[0], 10) : 30;
        
        const purchaseDate = new Date(r.date);
        const expirationDate = new Date(purchaseDate.getTime() + days * 24 * 60 * 60 * 1000);
        const msRemaining = expirationDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

        if (daysRemaining > 0 && daysRemaining <= 7) {
          list.push({
            id: `${r.id}-garantia-soon`,
            type: "garantia_proxima",
            title: "⚠️ Garantía próxima a vencer",
            description: `Al pedido #${r.consecutive} de ${r.clientName} le quedan solo ${daysRemaining} días de garantía.`,
            date: r.date,
            consecutive: r.consecutive,
            receipt: r
          });
        }
      }

      // 3. Purchases by VIP clients
      const clientObj = clients.find(
        (c) =>
          c.name.trim().toLowerCase() === r.clientName.trim().toLowerCase() &&
          c.phone.trim() === r.clientPhone.trim()
      );
      if (clientObj?.tag === "VIP") {
        list.push({
          id: `${r.id}-compra-vip`,
          type: "compra_vip",
          title: "👑 Compra de Cliente VIP",
          description: `El cliente VIP ${r.clientName} realizó la compra #${r.consecutive} por ${formatCOP(r.totalCharged)}.`,
          date: r.date,
          consecutive: r.consecutive,
          receipt: r
        });
      }
    });

    // Sort alerts by date (most recent first)
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [receipts, clients]);

  // Generate historical data for charts (Last 7 Days)
  const chartData = useMemo(() => {
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const now = new Date();
    const result = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayLabel = days[d.getDay()];
      const dateStr = d.toISOString().split("T")[0];

      let sales = 0;
      let profit = 0;

      receipts.forEach((r) => {
        if (r.date.startsWith(dateStr)) {
          sales += r.totalCharged || 0;
          profit += r.totalProfit || 0;
        }
      });

      result.push({
        label: dayLabel,
        date: dateStr,
        sales,
        profit,
      });
    }

    return result;
  }, [receipts]);

  // Max value in chart for scaling
  const maxChartVal = useMemo(() => {
    const maxVal = Math.max(...chartData.map((d) => d.sales), 100);
    return Math.ceil(maxVal * 1.15); // Add 15% padding
  }, [chartData]);

  const formattedTodayDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }).replace(/^\w/, (c) => c.toUpperCase());
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-2 animate-fade-in">
      {/* Welcome Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Panel de Control
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Resumen administrativo de ventas, utilidades, alertas y garantías de ImpulsaNet
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-white border border-gray-100 rounded-lg px-3 py-1.5 shadow-2xs">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>{formattedTodayDate}</span>
        </div>
      </div>

      {/* Centro de Alertas de Control (Uso Interno) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-500 animate-pulse" />
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Centro de Alertas de Control</h3>
          </div>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full border border-indigo-150">
            {activeAlerts.length} alertas activas
          </span>
        </div>

        {activeAlerts.length === 0 ? (
          <div className="flex items-center gap-3 bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-emerald-900">No hay alertas pendientes</h4>
              <p className="text-[11px] text-emerald-600 mt-0.5">Todas las garantías están estables y no hay requerimientos pendientes.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-56 overflow-y-auto pr-1">
            {activeAlerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => onSelectReceipt?.(alert.receipt)}
                className="text-left bg-gray-50 hover:bg-indigo-50/50 border border-gray-150 hover:border-indigo-200 rounded-xl p-3.5 transition flex items-start gap-3 group cursor-pointer"
              >
                <div className="p-1.5 rounded-lg shrink-0 mt-0.5 bg-white border border-gray-200">
                  {alert.type === "garantia_en_proceso" ? (
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                  ) : alert.type === "garantia_proxima" ? (
                    <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-purple-500" />
                  )}
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-gray-900 truncate">{alert.title}</span>
                    <ChevronRight className="w-3 h-3 text-gray-400 group-hover:translate-x-0.5 transition shrink-0" />
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal line-clamp-2">{alert.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Ventas Hoy */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ventas de Hoy</span>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <DollarSign className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{formatCOP(stats.dailySales)}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Sincronizado al instante</p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-indigo-500"></div>
        </motion.div>

        {/* Ganancias Hoy */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ganancia de Hoy</span>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-emerald-700 tracking-tight">{formatCOP(stats.dailyProfit)}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Margen administrativo</p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500"></div>
        </motion.div>

        {/* Ventas del Mes */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ventas del Mes</span>
            <div className="p-2 bg-gray-50 rounded-lg">
              <Layers className="w-4 h-4 text-gray-600" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{formatCOP(stats.monthlySales)}</h3>
            <p className="text-[10px] text-gray-400 mt-1">Semanal: {formatCOP(stats.weeklySales)}</p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-gray-400"></div>
        </motion.div>

        {/* Ganancias del Mes */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="bg-white p-5 rounded-xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Ganancia del Mes</span>
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Target className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-indigo-700 tracking-tight">{formatCOP(stats.monthlyProfit)}</h3>
            <p className="text-[10px] text-gray-400 mt-1">
              {stats.monthlySales > 0 
                ? `Eficiencia: ${((stats.monthlyProfit / stats.monthlySales) * 100).toFixed(0)}%`
                : "Sin ventas este mes"}
            </p>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-1 bg-indigo-600"></div>
        </motion.div>
      </div>

      {/* Main Grid: Chart and Side Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modern Custom Chart Component */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-950">Desempeño de Ventas</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">Historial de ventas y ganancias de los últimos 7 días</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-gray-700">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                <span>Ventas</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Ganancia</span>
              </div>
            </div>
          </div>

          {/* SVG Custom Render Graph (Linear & Stripe aesthetic) */}
          <div className="relative h-64 w-full">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] font-mono text-gray-400">
              <div className="border-b border-gray-100 pb-1 flex justify-between">
                <span>{formatCOP(maxChartVal)}</span>
                <span></span>
              </div>
              <div className="border-b border-gray-100 pb-1 flex justify-between">
                <span>{formatCOP(maxChartVal / 2)}</span>
                <span></span>
              </div>
              <div className="border-b border-gray-100 pb-1 flex justify-between">
                <span>$0</span>
                <span></span>
              </div>
            </div>

            {/* SVG Visualizer */}
            <div className="absolute inset-0 pt-4 pb-6 px-1 flex items-end justify-between">
              {chartData.map((day, idx) => {
                const salesHeight = `${(day.sales / maxChartVal) * 100}%`;
                const profitHeight = `${(day.profit / maxChartVal) * 100}%`;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full relative group">
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-2 bg-gray-900 text-white rounded-lg p-2.5 shadow-md text-[10px] font-mono pointer-events-none opacity-0 group-hover:opacity-100 transition duration-150 z-20 w-28 text-center -translate-y-1">
                      <div className="font-bold text-gray-300 border-b border-gray-800 pb-1 mb-1">{day.date}</div>
                      <div className="flex justify-between">
                        <span>Venta:</span>
                        <span className="font-semibold text-indigo-300">{formatCOP(day.sales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Utilidad:</span>
                        <span className="font-semibold text-emerald-300">{formatCOP(day.profit)}</span>
                      </div>
                    </div>

                    {/* Columns containers */}
                    <div className="w-full flex justify-center items-end h-full gap-1.5 px-2">
                      {/* Sales Column */}
                      <div
                        className="w-4 bg-indigo-600 hover:bg-indigo-500 transition rounded-t-sm relative"
                        style={{ height: salesHeight }}
                      ></div>
                      {/* Profit Column */}
                      <div
                        className="w-4 bg-emerald-500 hover:bg-emerald-400 transition rounded-t-sm relative"
                        style={{ height: profitHeight }}
                      ></div>
                    </div>

                    {/* Date label */}
                    <span className="absolute top-full mt-2 text-[10px] font-bold text-gray-400 uppercase">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Totals & Best Sellers Overview */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-5">
          <div>
            <h3 className="text-sm font-bold text-gray-950">Resumen Operativo</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Indicadores de transacciones y clientes</p>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-150 text-center">
              <div className="text-[9px] font-bold text-gray-400 uppercase">Comprobantes</div>
              <div className="text-lg font-bold text-gray-950 mt-0.5">{stats.receiptsCount}</div>
            </div>

            <div className="bg-gray-50/50 p-3 rounded-lg border border-gray-150 text-center">
              <div className="text-[9px] font-bold text-gray-400 uppercase">Clientes Únicos</div>
              <div className="text-lg font-bold text-gray-950 mt-0.5">{stats.clientsCount}</div>
            </div>
          </div>

          {/* Pedidos por Período */}
          <div className="bg-gray-50/40 p-4 rounded-xl border border-gray-150/80 space-y-2.5">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Flujo de Pedidos</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] text-gray-400 font-semibold">Hoy</div>
                <div className="text-sm font-bold text-gray-800">{stats.ordersToday}</div>
              </div>
              <div className="border-x border-gray-200">
                <div className="text-[10px] text-gray-400 font-semibold">Semana</div>
                <div className="text-sm font-bold text-indigo-600">{stats.ordersWeek}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-semibold">Mes</div>
                <div className="text-sm font-bold text-emerald-600">{stats.ordersMonth}</div>
              </div>
            </div>
          </div>

          {/* Segmentación de Clientes */}
          <div className="bg-gray-50/40 p-4 rounded-xl border border-gray-150/80 space-y-2.5">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tipo de Cliente</h4>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div>
                <div className="text-[10px] text-gray-400 font-semibold">Nuevos (1 compra)</div>
                <div className="text-sm font-bold text-gray-800 mt-0.5">{stats.newClientsCount}</div>
              </div>
              <div className="border-l border-gray-200">
                <div className="text-[10px] text-gray-400 font-semibold">Recurrentes</div>
                <div className="text-sm font-bold text-indigo-600 mt-0.5">{stats.recurrentClientsCount}</div>
              </div>
            </div>
          </div>

          {/* Ticket Promedio */}
          <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100/50 flex justify-between items-center">
            <div>
              <h5 className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Promedio de Venta</h5>
              <p className="text-[10px] text-gray-400 mt-0.5">Ticket medio por orden</p>
            </div>
            <div className="text-xs font-mono font-bold text-indigo-700">{formatCOP(stats.averageSale)}</div>
          </div>
        </div>
      </div>

      {/* Advanced Administrative Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Order states and Warranty tracking */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-950">Seguimiento de Pedidos y Garantías</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Distribución en tiempo real de estados y coberturas</p>
          </div>

          <div className="space-y-5">
            {/* Pedidos por Estado */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Pedidos por Estado</h4>
              <div className="space-y-2 text-xs">
                {/* En Proceso */}
                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-gray-700">
                    <span>🟢 En proceso</span>
                    <span className="font-mono">{stats.countEnProceso}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${stats.receiptsCount > 0 ? (stats.countEnProceso / stats.receiptsCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Completados */}
                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-gray-700">
                    <span>✅ Completado</span>
                    <span className="font-mono">{stats.countCompletado}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-500"
                      style={{ width: `${stats.receiptsCount > 0 ? (stats.countCompletado / stats.receiptsCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Garantías en Proceso */}
                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-gray-700">
                    <span>🟡 Garantía en proceso</span>
                    <span className="font-mono">{stats.countGarantiaEnProceso}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-500"
                      style={{ width: `${stats.receiptsCount > 0 ? (stats.countGarantiaEnProceso / stats.receiptsCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Cancelados */}
                <div className="space-y-1">
                  <div className="flex justify-between font-semibold text-gray-700">
                    <span>🔴 Cancelado</span>
                    <span className="font-mono">{stats.countCancelado}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full transition-all duration-500"
                      style={{ width: `${stats.receiptsCount > 0 ? (stats.countCancelado / stats.receiptsCount) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Garantías por Cobertura */}
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cobertura de Garantías Activas</h4>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="bg-emerald-50/30 p-2.5 border border-emerald-100/30 rounded-lg">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Activas</div>
                  <div className="text-sm font-mono font-bold text-emerald-700 mt-1">{stats.countWarrantyActive}</div>
                </div>
                <div className="bg-amber-50/30 p-2.5 border border-amber-100/30 rounded-lg">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Por vencer</div>
                  <div className="text-sm font-mono font-bold text-amber-700 mt-1">{stats.countWarrantySoon}</div>
                </div>
                <div className="bg-rose-50/30 p-2.5 border border-rose-100/30 rounded-lg">
                  <div className="text-[10px] text-gray-400 font-bold uppercase">Vencidas</div>
                  <div className="text-sm font-mono font-bold text-rose-700 mt-1">{stats.countWarrantyExpired}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Top Clients and average performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-950">Clientes más Importantes</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Top de facturación acumulada por cliente</p>
          </div>

          <div className="space-y-4">
            {/* List of top clients */}
            {stats.topClients.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-6 text-center">Aún no hay clientes registrados.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {stats.topClients.map((client, idx) => {
                  let badgeStyle = "bg-gray-100 text-gray-700 border-gray-200";
                  if (client.tag === "VIP") badgeStyle = "bg-purple-100 text-purple-800 border-purple-200";
                  else if (client.tag === "Frecuente") badgeStyle = "bg-blue-100 text-blue-800 border-blue-200";
                  else if (client.tag === "Mayorista") badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-200";

                  return (
                    <div key={idx} className="flex justify-between items-center py-2.5 text-xs">
                      <div className="flex items-center gap-2 pr-2 min-w-0">
                        <span className="font-mono font-bold text-slate-400 shrink-0">#{idx + 1}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-gray-800 truncate">{client.name}</span>
                            {client.tag && (
                              <span className={`text-[8px] px-1 py-0.2 rounded font-extrabold border shrink-0 ${badgeStyle}`}>
                                {client.tag}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono block mt-0.5">{client.phone}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-gray-900">{formatCOP(client.spent)}</div>
                        <div className="text-[9px] text-gray-400 font-semibold">{client.count} pedidos</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Performance Indicators */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
              <div className="bg-indigo-50/30 p-3 rounded-lg border border-indigo-100/30">
                <span className="text-[10px] font-bold text-indigo-500 uppercase">Venta Promedio</span>
                <div className="text-xs font-mono font-bold text-indigo-950 mt-1">{formatCOP(stats.averageSale)}</div>
              </div>
              <div className="bg-emerald-50/30 p-3 rounded-lg border border-emerald-100/30">
                <span className="text-[10px] font-bold text-emerald-500 uppercase">Ganancia Promedio</span>
                <div className="text-xs font-mono font-bold text-emerald-950 mt-1">{formatCOP(stats.averageProfit)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Services & Social networks stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Services (List ordering) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-3">
            <Award className="w-3.5 h-3.5 text-yellow-500" />
            Servicios más Vendidos
          </h4>
          {stats.topServices.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4 text-center">Aún no se registran servicios facturados.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {stats.topServices.map((srv, index) => (
                <div key={index} className="flex justify-between items-center py-2.5 text-xs">
                  <div className="truncate pr-3">
                    <span className="font-mono font-bold text-indigo-400 mr-2">#{index + 1}</span>
                    <span className="font-medium text-gray-800">{srv.name}</span>
                  </div>
                  <div className="text-right font-mono text-gray-600 font-semibold shrink-0">
                    {formatCOP(srv.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Social Networks (List ordering) */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-3">
            <Target className="w-3.5 h-3.5 text-indigo-500" />
            Redes Sociales más Exitosas
          </h4>
          {stats.topSocials.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4 text-center">Aún no se registran redes facturadas.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {stats.topSocials.map((sn, index) => (
                <div key={index} className="flex justify-between items-center py-2.5 text-xs">
                  <div className="truncate pr-3">
                    <span className="font-mono font-bold text-emerald-400 mr-2">#{index + 1}</span>
                    <span className="font-medium text-gray-800">{sn.name}</span>
                  </div>
                  <div className="text-right font-mono text-gray-600 font-semibold shrink-0">
                    {formatCOP(sn.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Call to Action Grid */}
      <div className="bg-indigo-950 text-white p-6 md:p-8 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_10px_20px_rgba(79,70,229,0.15)]">
        <div className="space-y-1">
          <h3 className="text-lg font-bold tracking-tight">Generador de Comprobantes</h3>
          <p className="text-xs text-indigo-200 leading-relaxed max-w-lg">
            Emita comprobantes de compra profesionales con cálculo automático de costos del proveedor y ganancias, listos para descargar o imprimir al instante.
          </p>
        </div>
        <button
          id="btn-goto-generator"
          onClick={() => onViewChange("generator")}
          className="bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs py-2.5 px-5 rounded-lg flex items-center gap-2 transition shadow-sm whitespace-nowrap self-start md:self-center cursor-pointer"
        >
          Nuevo Comprobante
          <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
        </button>
      </div>
    </div>
  );
};
