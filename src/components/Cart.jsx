"use client";

import React, { useContext } from "react";
import Link from "next/link";
import { CartContext } from "@/Context/CartContext";
import { OffCanvasContext } from "@/Context/canvas";
import { supabase } from "@/Config/supabase";
import { useState } from "react";

export default function Cart() {
  const { state: cartItems, dispatch } = useContext(CartContext);
  const { isOpenCanvas, setOpenCanvas } = useContext(OffCanvasContext);
  const [updatingCartId, setUpdatingCartId] = useState(null);


  if (!isOpenCanvas) return null;

  const handleUpdateQuantity = async (productId, currentQty, amount) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const targetQty = currentQty + amount;

    try {
      setUpdatingCartId(productId);

      if (targetQty <= 0) {
        await supabase
          .from("user_carts")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);

        dispatch({ type: "deleteProduct", id: productId });
      } else {
        await supabase
          .from("user_carts")
          .update({ quantity: targetQty })
          .eq("user_id", user.id)
          .eq("product_id", productId);

        dispatch({
          type: "updateQuantity",
          data: { id: productId, quantity: targetQty }
        });
      }
    } catch (err) {
      console.error("Cart database synchronization failed:", err.message);
    } finally {
      setUpdatingCartId(null);
    }
  };


  const handleDeleteItem = async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_carts").delete().eq("user_id", user.id).eq("product_id", id);
    }
    dispatch({ type: "deleteProduct", data: { id } });
  };

  const handleClearAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_carts").delete().eq("user_id", user.id);
    }
    dispatch({ type: "deleteAllProduct" });
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * (item.quantity || 1), 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40 transition-opacity" onClick={() => setOpenCanvas(false)} />

      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col justify-between z-10 transition-transform duration-300">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Shopping Basket</h2>
            <p className="text-xs text-gray-500 mt-0.5">Your select healthcare items ({cartItems.length})</p>
          </div>
          <button onClick={() => setOpenCanvas(false)} className="text-gray-400 hover:text-gray-600 font-medium text-xl p-1">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="text-gray-400 text-sm">Your basket is currently empty.</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between border border-gray-100 rounded-xl p-3 bg-white shadow-sm gap-4">
                <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-gray-50 rounded-lg p-1">
                  <img src={item.image} alt={item.title} className="max-w-full max-h-full object-contain" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-gray-800 line-clamp-1 mb-1.5">{item.title}</h4>

                  {/* FIXED STRUCTURAL COUNTER CONTAINER */}
                  <div className="flex items-center justify-between bg-gray-100 rounded-xl p-1 w-28 h-9 select-none flex-shrink-0">
                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                      disabled={updatingCartId === item.id}
                      className="w-7 h-7 flex items-center justify-center font-black text-sm text-gray-500 hover:text-red-600 hover:bg-white rounded-lg transition disabled:opacity-40"
                    >
                      -
                    </button>

                    <span className="text-xs font-bold text-gray-800 flex items-center justify-center h-full flex-1">
                      {updatingCartId === item.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        item.quantity
                      )}
                    </span>

                    <button
                      onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                      disabled={updatingCartId === item.id || item.quantity >= (item.stock || 99)}
                      className="w-7 h-7 flex items-center justify-center font-black text-sm text-gray-500 hover:text-green-600 hover:bg-white rounded-lg transition disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="text-right flex flex-col justify-between items-end h-full py-1 min-w-[90px]">
                  <button onClick={() => handleDeleteItem(item.id)} className="text-[10px] text-red-500 hover:text-red-600 font-medium tracking-wide">
                    Remove
                  </button>
                  <p className="text-xs font-bold text-gray-900 mt-2">
                    Rs. {item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-6 border-t border-gray-100 bg-gray-50 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">Subtotal Balance</span>
              <span className="text-base font-black text-gray-900">
                Rs. {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 text-center leading-normal">
              Shipping fees and prescription checks will be settled during final confirmation.
            </p>
            <Link href="/checkout" onClick={() => setOpenCanvas(false)} className="block w-full">
              <button className="w-full py-3 bg-[#00ab55] hover:bg-green-600 text-white font-bold rounded-xl text-sm transition active:scale-[0.99] shadow-sm text-center">
                Proceed To Checkout
              </button>
            </Link>
            <button onClick={handleClearAll} className="w-full text-center text-xs font-semibold text-gray-400 hover:text-red-500 transition pt-1">
              Clear Everything
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
