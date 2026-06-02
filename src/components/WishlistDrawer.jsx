"use client";

import React, { useContext } from "react";
import Link from "next/link";
import { WishlistContext } from "@/Context/WishlistContext";
import { CartContext } from "@/Context/CartContext";
import { OffCanvasContext } from "@/Context/canvas";
import { supabase } from "@/Config/supabase";

export default function WishlistDrawer() {
  const { wishlistItems, removeFormWishlist } = useContext(WishlistContext);
  const { state: cartItems, dispatch: cartDispatch } = useContext(CartContext);
  const { isWishlistOpen, setIsWishlistOpen } = useContext(OffCanvasContext);

  if (!isWishlistOpen) return null;

  const handleAddToCart = async (product) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase.from("user_carts").upsert(
        { user_id: user.id, product_id: product.id, quantity: 1 },
        { onConflict: "user_id,product_id" }
      );

      cartDispatch({ type: "addProduct", data: product });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40 transition-opacity" onClick={() => setIsWishlistOpen(false)} />
      
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col justify-between z-10 transition-transform duration-300">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Saved Wishlist</h2>
            <p className="text-xs text-gray-500 mt-0.5">Your favorites inventory ({wishlistItems.length})</p>
          </div>
          <button onClick={() => setIsWishlistOpen(false)} className="text-gray-400 hover:text-gray-600 font-medium text-xl p-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {wishlistItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="text-gray-400 text-sm">Your wishlist is currently empty.</p>
            </div>
          ) : (
            wishlistItems.map((item) => {
              const cartItem = cartItems.find((c) => c.id === item.id);
              const isItemInCart = !!cartItem;

              return (
                <div key={item.id} className="flex items-center justify-between border border-gray-100 rounded-xl p-3 bg-white shadow-sm gap-4">
                  {/* Clickable Image & Details Wrapper to navigate to Dynamic Product details Page */}
                  <Link 
                    href={`/product/${item.id}`} 
                    onClick={() => setIsWishlistOpen(false)} 
                    className="flex-1 min-w-0 flex items-center gap-4 group cursor-pointer"
                  >
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-gray-50 rounded-lg p-1 group-hover:scale-105 transition duration-200">
                      <img src={item.image} alt="" className="max-w-full max-h-full object-contain" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-gray-800 line-clamp-1 mb-1 group-hover:text-pink-600 transition">
                        {item.title}
                      </h4>
                      <p className="text-xs font-bold text-green-600">Rs. {Number(item.price).toFixed(2)}</p>
                    </div>
                  </Link>

                  <div className="text-right flex flex-col justify-between items-end h-full min-w-[110px] gap-2">
                    <button onClick={() => removeFormWishlist(item.id)} className="text-[10px] text-gray-400 hover:text-red-500 transition font-medium">
                      Remove
                    </button>
                    
                    {isItemInCart ? (
                      <div className="w-full py-1.5 bg-gray-100 border border-gray-200 text-gray-500 rounded-lg text-[10px] font-bold text-center select-none shadow-inner">
                        In Cart ({cartItem.quantity})
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleAddToCart(item)}
                        className="w-full py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-[10px] font-bold transition whitespace-nowrap shadow-sm text-center active:scale-[0.98]"
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
