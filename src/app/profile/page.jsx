"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { supabase } from "@/Config/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("active");


  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function loadProfileDashboardData() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          toast.error("Please log in to view your profile panel.");
          router.replace("/");
          return;
        }

        setUser(session.user);

        // Fetch profile metrics safely using maybeSingle
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, phone_number, delivery_address, city, is_admin")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileData) {
          setFullName(profileData.full_name || "");
          setPhone(profileData.phone_number || "");
          setAddress(profileData.delivery_address || "");
          setCity(profileData.city || "");
          if (profileData.is_admin || session.user.app_metadata?.role === "admin") {
            setIsAdmin(true);
          }
        }

        // 💡 CRITICAL CHANGE: Admin accounts skip fetching customer orders to prevent thread crashes
        if (profileData?.is_admin || session.user.app_metadata?.role === "admin") {
          setOrders([]);
          return;
        }

        // Standard user purchase logs data collection
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("id, total, status, created_at, order_items(quantity, price_at_purchase, products(title, image))")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (!ordersError && ordersData) {
          setOrders(ordersData);
        }
      } catch (err) {
        console.error("Profile view pipeline error:", err.message);
      } finally {
        // Guaranteed loading shield switch-off
        setLoading(false);
      }
    }

    loadProfileDashboardData();
  }, [router]);
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        phone_number: phone,
        delivery_address: address,
        city: city,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      toast.success("Profile records updated successfully!");
    } catch (err) {
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    try {
      setUpdatingPassword(true);
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) {
        toast.error("Current password verification failed.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      toast.success("Password changed successfully!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      toast.error(`Password update failed: ${err.message}`);
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm font-semibold text-gray-400 animate-pulse tracking-wide">
          Syncing account data files...
        </div>
      </div>
    );
  }
  const activeOrders = orders.filter(o => {
    const s = (o.status || "").toLowerCase();
    return s === "pending" || s === "processing" || s === "delivering" || s === "return requested" || s === "returning";
  });
  const historyOrders = orders.filter(o => {
    const s = (o.status || "").toLowerCase();
    return s === "delivered" || s === "cancelled" || s === "returned" || s === "not returned";
  });

  const visibleOrders = activeTab === "active" ? activeOrders : historyOrders;
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-950">
            {isAdmin ? "Admin Dashboard" : "My Account"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin
              ? "Global pharmacy settings configuration matrix and secure dashboard portal."
              : "Manage saved shipping metrics and track chronological package parameters."}
          </p>
        </div>
        <button
          onClick={async () => { await supabase.auth.signOut(); toast.success("Logged out."); window.location.href = "/"; }}
          className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-bold rounded-xl transition"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-2 mb-4">Account Settings</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-3.5">
              <div><label className="block text-[11px] text-gray-400 font-medium mb-1">Email Address (Read-only)</label><input type="text" disabled value={user?.email || ""} className="w-full px-3 py-2 bg-gray-100 border border-gray-100 rounded-xl text-xs text-gray-500 cursor-not-allowed outline-none" /></div>
              <div><label className="block text-[11px] text-gray-400 font-medium mb-1">Full Name</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500" /></div>
              <div><label className="block text-[11px] text-gray-400 font-medium mb-1">Phone Number</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500" /></div>
              <div><label className="block text-[11px] text-gray-400 font-medium mb-1">Delivery Address</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500" /></div>
              <div><label className="block text-[11px] text-gray-400 font-medium mb-1">City</label><input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500" /></div>
              <button type="submit" disabled={savingProfile} className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50">{savingProfile ? "Saving Details..." : "Update Details"}</button>
            </form>
          </div>

          {user && user.app_metadata?.providers?.includes("email") && (
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-2 mb-4">Security Credentials</h2>
              <form onSubmit={handleChangePassword} className="space-y-3.5">
                <div><label className="block text-[11px] text-gray-400 font-medium mb-1">Current Password</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500" /></div>
                <div><label className="block text-[11px] text-gray-400 font-medium mb-1">New Password</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500" /></div>
                <div><label className="block text-[11px] text-gray-400 font-medium mb-1">Confirm New Password</label><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500" /></div>
                <button type="submit" disabled={updatingPassword} className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer">{updatingPassword ? "Changing..." : "Change Password"}</button>
              </form>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          {/* ADAPTIVE INTERFACE ACTION CONTROL: Swaps lists for a dynamic redirect option if an Admin session is active */}
          {isAdmin ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center shadow-sm">
              <div className="w-14 h-14 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.25 2.25 0 0 1 10.5 2.25h4.5a2.25 2.25 0 0 1 2.242 1.948M3.75 19.5h16.5M3.75 4.5h16.5M3.75 4.5v15M20.25 4.5v15" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Global Store Order Tracking</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">You are logged in with full system clearance. Click below to inspect store-wide consumer checkout invoices and modify fulfillment statuses.</p>
              <Link href="/admin/orders" className="inline-flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg transform active:scale-[0.98]">
                See Orders Control Center →
              </Link>
            </div>
          ) : (
            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
                <h2 className="text-xl font-bold text-gray-900">Purchase History</h2>

                {/* TABS INTERACTIVE BUTTON CONTAINER BAR */}
                <div className="flex bg-gray-100 p-1 rounded-xl gap-1 select-none flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("active")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "active" ? "bg-white text-pink-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                      }`}
                  >
                    Active Tracking ({activeOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("history")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === "history" ? "bg-white text-pink-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                      }`}
                  >
                    Fulfills & Logs ({historyOrders.length})
                  </button>
                </div>
              </div>


              {orders.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-gray-200 rounded-2xl bg-white">
                  <p className="text-gray-400 text-sm">You haven't placed any invoice transactions yet.</p>
                  <Link href="/" className="inline-block mt-4 text-xs font-bold text-pink-600 hover:text-pink-700">Continue Shopping →</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {visibleOrders.map((order) => {
                    // Status control flags
                    const isCancellable = order.status === "Pending" || order.status === "Processing";
                    const isDelivered = order.status === "Delivered";
                    const isReturned = order.status === "Return Requested";

                    // Fast action triggers to update statuses directly
                    const handleCancelOrder = async () => {
                      if (!confirm("Are you sure you want to cancel this order?")) return;
                      try {
                        const { error } = await supabase
                          .from("orders")
                          .update({ status: "Cancelled" })
                          .eq("id", order.id);
                        if (error) throw error;
                        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "Cancelled" } : o));
                        toast.success("Order cancelled successfully!");
                      } catch (e) { toast.error("Cancellation failed."); }
                    };

                    const handleReturnRequest = async () => {
                      if (!confirm("Do you want to request a return for this delivered package?")) return;
                      try {
                        const { error } = await supabase
                          .from("orders")
                          .update({ status: "Return Requested" })
                          .eq("id", order.id);
                        if (error) throw error;
                        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "Return Requested" } : o));
                        toast.success("Return request submitted to administration.");
                      } catch (e) { toast.error("Return request failed."); }
                    };

                    return (
                      <div key={order.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3 text-xs">
                          <div className="flex gap-4">
                            <div><span className="text-gray-400 font-medium block">Order Placed</span><span className="font-semibold text-gray-700">{new Date(order.created_at).toLocaleDateString()}</span></div>
                            <div><span className="text-gray-400 font-medium block">Invoice ID</span><span className="font-semibold text-gray-700">#DV-00{order.id}</span></div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="font-black text-gray-900 text-sm">Rs. {Number(order.total).toFixed(2)}</span>
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${(order.status || "").toLowerCase() === 'delivered' || (order.status || "").toLowerCase() === 'returned' ? 'bg-green-50 text-green-700' :
                              (order.status || "").toLowerCase() === 'cancelled' || (order.status || "").toLowerCase() === 'not returned' ? 'bg-red-50 text-red-700' :
                                (order.status || "").toLowerCase() === 'return requested' || (order.status || "").toLowerCase() === 'returning' ? 'bg-purple-50 text-purple-700' :
                                  'bg-yellow-50 text-yellow-700'
                              }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>

                        {(isCancellable || isDelivered || isReturned) && (
                          <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-50 flex justify-end items-center">
                            {isCancellable && (
                              <button
                                onClick={handleCancelOrder}
                                className="px-3 py-1.5 border border-red-200 bg-red-50/30 hover:bg-red-50 text-red-600 rounded-xl text-[11px] font-bold transition shadow-sm"
                              >
                                Cancel Order
                              </button>
                            )}
                            {isDelivered && (
                              <button
                                onClick={handleReturnRequest}
                                className="px-3 py-1.5 border border-purple-200 bg-purple-50/30 hover:bg-purple-50 text-purple-600 rounded-xl text-[11px] font-bold transition shadow-sm animate-pulse"
                              >
                                Request Product Return
                              </button>
                            )}
                            {isReturned && (
                              <span className="text-[11px] text-purple-500 font-bold tracking-wide italic">
                                ⏳ Waiting for administrative return audit authorization...
                              </span>
                            )}
                          </div>
                        )}

                        <div className="p-4 divide-y divide-gray-50">
                          {order.order_items?.map((item, idx) => {
                            const pInfo = item.products;
                            return (
                              <div key={idx} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-lg p-1 flex-shrink-0 flex items-center justify-center">
                                    {pInfo?.image && <img src={pInfo.image} alt="" className="max-w-full max-h-full object-contain" />}
                                  </div>
                                  <h4 className="text-xs font-medium text-gray-800 truncate">{pInfo?.title || "Product details metadata sheet"}</h4>
                                </div>
                                <span className="text-xs font-semibold text-gray-400 flex-shrink-0">Qty {item.quantity} × Rs. {Number(item.price_at_purchase).toFixed(2)}</span>
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
          )}
        </div>
      </div>
    </div>
  );
}
