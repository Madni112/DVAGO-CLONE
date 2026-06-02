"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "@/Config/supabase";

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    async function secureAdminDashboard() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          toast.error("Access denied. Please log in first.");
          router.replace("/");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!profile?.is_admin && session.user.app_metadata?.role !== "admin") {
          toast.error("Unauthorized access. Admin privileges required.");
          router.replace("/");
          return;
        }

        await fetchAllGlobalOrders();
      } catch (err) {
        console.error(err);
        router.replace("/");
      } finally {
        setLoading(false);
      }
    }
    secureAdminDashboard();
  }, [router]);

  async function fetchAllGlobalOrders() {
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select(`
        id,
        user_id,
        full_name,
        phone_number,
        delivery_address,
        city,
        subtotal,
        shipping_fee,
        total,
        status,
        created_at,
        order_items (
          quantity,
          price_at_purchase,
          products (
            title,
            image
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (!ordersError && ordersData) {
      setOrders(ordersData);
    } else if (ordersError) {
      toast.error(`Failed to load invoices: ${ordersError.message}`);
    }
  }
  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order))
    );

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      toast.success(`Order #${orderId} set to ${newStatus}`);
    } catch (err) {
      toast.error(`Sync aborted: ${err.message}`);
      await fetchAllGlobalOrders();
    } finally {
      setUpdatingId(null);
    }
  };

  // 🧠 CENTRALIZED MULTI-STREAM DYNAMIC FILTER CODES
  const filteredOrders = orders.filter((order) => {
    if (statusFilter === "All") return true;
    const s = (order.status || "").toLowerCase();
    
    // Custom Group Filters matched to the clickable metrics layout cards
    if (statusFilter === "RevenueStream") {
      return s !== "cancelled"; 
    }
    if (statusFilter === "ActivePackages") {
      return s === "pending" || s === "processing" || s === "delivering";
    }
    if (statusFilter === "ReturnAudits") {
      return s === "return requested" || s === "returning";
    }
    
    // Fallback to absolute standard single-status matches
    return order.status === statusFilter;
  });

  // Real-time metrics calculations
  const totalRevenue = orders
    .filter(o => (o.status || "").toLowerCase() !== "cancelled")
    .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  const activeShipments = orders.filter(o => {
    const s = (o.status || "").toLowerCase();
    return s === "pending" || s === "processing" || s === "delivering";
  }).length;

  const openReturns = orders.filter(o => {
    const s = (o.status || "").toLowerCase();
    return s === "return requested" || s === "returning";
  }).length;

  const cancelledLosses = orders.filter(o => (o.status || "").toLowerCase() === "cancelled").length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm font-semibold text-gray-400 animate-pulse">
          Loading global operations log...
        </div>
      </div>
    );
  }
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12">
      
      {/* HEADER SECTION WITH ADVANCED SELECTION OPTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950">Global Order Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">Review live checkouts, inspect patient metrics, and modify parcel distribution states.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filter State:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer text-gray-700 shadow-sm"
          >
            <option value="All">All Transactions</option>
            <option value="RevenueStream">Sold Orders (Excl. Cancelled)</option>
            <option value="ActivePackages">Active Shipments</option>
            <option value="ReturnAudits">Return Requested / Returning</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Not Returned">Not Returned</option>
          </select>
        </div>
      </div>

      {/* 🚀 HIGH-FIDELITY INTERACTIVE CLICKABLE METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 select-none">
        <div 
          onClick={() => setStatusFilter("RevenueStream")}
          className={`border p-5 rounded-2xl shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] ${
            statusFilter === "RevenueStream" ? "bg-green-50/50 border-green-300 ring-2 ring-green-100" : "bg-white border-gray-100 hover:border-green-200"
          }`}
        >
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Gross Revenue (Sold)</span>
          <h3 className="text-2xl font-black text-green-600 mt-2">Rs. {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
        </div>

        <div 
          onClick={() => setStatusFilter("ActivePackages")}
          className={`border p-5 rounded-2xl shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] ${
            statusFilter === "ActivePackages" ? "bg-blue-50/50 border-blue-300 ring-2 ring-blue-100" : "bg-white border-gray-100 hover:border-blue-200"
          }`}
        >
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Shipments</span>
          <h3 className="text-2xl font-black text-blue-600 mt-2">{activeShipments} Packages</h3>
        </div>

        <div 
          onClick={() => setStatusFilter("ReturnAudits")}
          className={`border p-5 rounded-2xl shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] ${
            statusFilter === "ReturnAudits" ? "bg-purple-50/50 border-purple-300 ring-2 ring-purple-100" : "bg-white border-gray-100 hover:border-purple-200"
          }`}
        >
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Open Return Tickets</span>
          <h3 className="text-2xl font-black text-purple-600 mt-2">{openReturns} Audits</h3>
        </div>

        <div 
          onClick={() => setStatusFilter("Cancelled")}
          className={`border p-5 rounded-2xl shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] ${
            statusFilter === "Cancelled" ? "bg-red-50/50 border-red-300 ring-2 ring-red-100" : "bg-white border-gray-100 hover:border-red-200"
          }`}
        >
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Cancelled Invoices</span>
          <h3 className="text-2xl font-black text-red-500 mt-2">{cancelledLosses} Transactions</h3>
        </div>
      </div>
      {/* FILTERED RESULTS LOGS LIST */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-gray-200 rounded-3xl bg-white shadow-sm">
          <p className="text-gray-400 text-sm">No recorded invoices match the selected filter configuration.</p>
          <button onClick={() => setStatusFilter("All")} className="mt-3 text-xs font-bold text-pink-600 hover:underline">Reset Filters View</button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const currentStatus = (order.status || "").toLowerCase();
            const isTerminalState = currentStatus === "delivered" || currentStatus === "cancelled" || currentStatus === "returned" || currentStatus === "not returned";

            return (
              <div key={order.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-pink-600">
                <div className="p-5 bg-gray-50 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 text-xs">
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <span className="text-gray-400 font-medium block mb-0.5">Checkout Timestamp</span>
                      <span className="font-bold text-gray-800">{new Date(order.created_at).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium block mb-0.5">Invoice ID Reference</span>
                      <span className="font-black text-pink-600">#DV-00{order.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-gray-400 font-medium block mb-0.5">Net Grand Total</span>
                      <span className="text-base font-black text-gray-900">Rs. {Number(order.total).toFixed(2)}</span>
                    </div>
                    
                    <select
                      value={order.status}
                      disabled={updatingId === order.id || isTerminalState}
                      onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                      className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-extrabold focus:outline-none focus:ring-2 focus:ring-pink-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-gray-800 transition"
                    >
                      {order.status === "Return Requested" || 
                       order.status === "Returning" || 
                       order.status === "Returned" || 
                       order.status === "Not Returned" ? (
                        <>
                          <option value="Return Requested">Return Requested</option>
                          <option value="Returning">Returning</option>
                          <option value="Returned">Returned</option>
                          <option value="Not Returned">Not Returned</option>
                        </>
                      ) : (
                        <>
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="Delivering">Delivering</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="bg-pink-50/10 px-6 py-4 border-b border-gray-100 text-xs text-gray-600 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <strong className="text-gray-400 uppercase font-bold text-[10px] block mb-1 tracking-wider">Recipient Full Name</strong>
                    <span className="font-bold text-gray-800 text-sm">{order.full_name}</span>
                  </div>
                  <div>
                    <strong className="text-gray-400 uppercase font-bold text-[10px] block mb-1 tracking-wider">Registered Contact Phone</strong>
                    <span className="font-bold text-gray-800 text-sm">{order.phone_number}</span>
                  </div>
                  <div>
                    <strong className="text-gray-400 uppercase font-bold text-[10px] block mb-1 tracking-wider">Delivery Destination Metrics</strong>
                    <span className="font-semibold text-gray-700 block leading-relaxed">{order.delivery_address}, <span className="uppercase font-bold text-gray-900">{order.city}</span></span>
                  </div>
                </div>

                <div className="p-6 divide-y divide-gray-50">
                  {order.order_items?.map((item, idx) => {
                    const productInfo = item.products;
                    return (
                      <div key={idx} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-xl p-1 flex-shrink-0 flex items-center justify-center">
                            {productInfo?.image && <img src={productInfo.image} alt="" className="max-w-full max-h-full object-contain" />}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-gray-800 truncate">{productInfo?.title || "Item info summary sheet"}</h4>
                            <span className="text-[10px] text-gray-400 font-medium block mt-0.5">Product catalog unit ID: #P-00{idx + 1}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-bold text-gray-800 block">Rs. {Number(item.price_at_purchase).toFixed(2)}</span>
                          <span className="text-[11px] text-gray-400 font-semibold block mt-0.5">Quantity: {item.quantity} units</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
