"use client";

import React, { useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { supabase } from "@/Config/supabase";
import { CartContext } from "@/Context/CartContext";

export default function CheckoutPage() {
  const router = useRouter();
  const { state, dispatch } = useContext(CartContext);
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    async function initCheckoutAuth() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          toast.error("Please log in to proceed to checkout.");
          router.replace("/");
          return;
        }

        setUser(session.user);

        // Pre-fill user billing indicators from their active profiles layer data
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone_number, delivery_address, city")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile) {
          setFullName(profile.full_name || "");
          setPhone(profile.phone_number || "");
          setAddress(profile.delivery_address || "");
          setCity(profile.city || "");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    initCheckoutAuth();
  }, [router]);

  // Pricing configuration matrices calculations matching layout design constraints
  const subtotal = state ? state.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0) : 0;
  const shippingFee = subtotal > 2000 ? 0 : 150; 
  const grandTotal = subtotal + shippingFee;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm font-semibold text-gray-400 animate-pulse tracking-wide">
          Syncing secure dispatch invoices...
        </div>
      </div>
    );
  }

  if (!state || state.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="text-center p-8 bg-white border border-gray-100 rounded-2xl max-w-sm shadow-sm">
          <p className="text-gray-400 text-sm mb-4">Your basket is completely empty.</p>
          <Link href="/" className="inline-block px-5 py-2.5 bg-pink-600 text-white font-bold rounded-xl text-xs uppercase tracking-wide transition">
            Return to Storefront
          </Link>
        </div>
      </div>
    );
  }
  const handlePlaceOrderSubmit = async (e) => {
    e.preventDefault();
    if (!fullName || !phone || !address || !city) {
      toast.error("Please populate all delivery data form input strings.");
      return;
    }

    try {
      setSubmitting(true);

      // 1. Transaction creation point registers the purchase order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            user_id: user.id,
            full_name: fullName,
            phone_number: phone,
            delivery_address: address,
            city: city,
            subtotal: subtotal,
            shipping_fee: shippingFee,
            total: grandTotal,
            status: "Pending"
          }
        ])
        .select("id")
        .maybeSingle();

      if (orderError) throw orderError;

      const orderId = orderData.id;

      // 2. Generate line items linking details vectors into order items bridge ledger
      const lineItemsRows = state.map((item) => ({
        order_id: orderId,
        product_id: item.id,
        quantity: Number(item.quantity),
        price_at_purchase: Number(item.price)
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(lineItemsRows);

      if (itemsError) throw itemsError;

      // 🚀 3. THE FIXED CONCURRENT LOOP: Subtracts quantities from catalog stock parameters
      try {
        for (const item of state) {
          const currentStock = Number(item.stock) || 0;
          const purchaseQty = Number(item.quantity) || 1;
          const nextStock = Math.max(0, currentStock - purchaseQty);

          await supabase
            .from("products")
            .update({ stock: nextStock })
            .eq("id", item.id);
        }
      } catch (stockErr) {
        console.error("Stock sync aborted:", stockErr.message);
      }

      // 4. Reset transaction cart item records and wipe user cart bridge tables inside DB
      await supabase
        .from("user_carts")
        .delete()
        .eq("user_id", user.id);

      dispatch({ type: "deleteAllProduct" });
      toast.success("Order processed and stock decremented successfully!");
      router.replace("/profile");
    } catch (err) {
      toast.error(`Order execution failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-gray-950 mb-8 border-b border-gray-100 pb-4">Secure Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-2 mb-6">Delivery Details</h2>
          <form onSubmit={handlePlaceOrderSubmit} className="space-y-4">
            <div><label className="block text-[11px] text-gray-400 font-medium mb-1 uppercase tracking-wider">Full Name *</label><input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition" /></div>
            <div><label className="block text-[11px] text-gray-400 font-medium mb-1 uppercase tracking-wider">Contact Phone *</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition" /></div>
            <div><label className="block text-[11px] text-gray-400 font-medium mb-1 uppercase tracking-wider">Street Address *</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition" /></div>
            <div><label className="block text-[11px] text-gray-400 font-medium mb-1 uppercase tracking-wider">City Location *</label><input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white transition" /></div>
            <button type="submit" disabled={submitting} className="w-full py-3.5 mt-4 bg-[#7bc143] hover:bg-green-600 text-white text-sm font-bold uppercase tracking-wider rounded-xl transition shadow active:scale-[0.99] disabled:opacity-50">{submitting ? "Processing Transaction..." : "Confirm & Place Order"}</button>
          </form>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900 border-b border-gray-50 pb-2">Order Summary</h2>
          <div className="divide-y divide-gray-50 max-h-[220px] overflow-y-auto pr-1">
            {state.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0 gap-3 text-xs">
                <span className="text-gray-600 truncate max-w-[180px] font-medium">{item.title}</span>
                <span className="text-gray-400 font-semibold flex-shrink-0">Qty {item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-4 space-y-2 text-xs font-semibold text-gray-500">
            <div className="flex justify-between"><span>Items Subtotal:</span><span className="text-gray-800">Rs. {subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Fulfillment Shipping Fee:</span><span className="text-gray-800">{shippingFee === 0 ? "FREE" : `Rs. ${shippingFee.toFixed(2)}`}</span></div>
            <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-50"><span>Net Order Total:</span><span className="text-green-600">Rs. {grandTotal.toFixed(2)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
