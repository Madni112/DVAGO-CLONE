"use client";

import React, { useState, useEffect, useContext } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "@/Config/supabase";
import { CartContext } from "@/Context/CartContext";
import { WishlistContext } from "@/Context/WishlistContext";
import { OffCanvasContext } from "@/Context/canvas";

function formatProductAge(timestampString) {
  if (!timestampString) return "";
  const createdDate = new Date(timestampString);
  const currentDate = new Date();
  const diffInMs = currentDate - createdDate;
  if (diffInMs < 0) return "Added just now";
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  if (diffInHours < 24) return `Added ${diffInHours || 1}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `Added ${diffInDays}d ago`;
  if (diffInDays < 30) return `Added ${Math.floor(diffInDays / 7)}w ago`;
  const diffInMonths = Math.floor(diffInDays / 30.43);
  if (diffInMonths < 12) return `Added ${diffInMonths || 1}m ago`;
  return `Added ${Math.floor(diffInMonths / 12) || 1}y ago`;
}

function formatProductEditAge(updatedAt, createdAt) {
  if (!updatedAt || !createdAt) return "";
  if (new Date(updatedAt).getTime() === new Date(createdAt).getTime()) return "";

  const updatedDate = new Date(updatedAt);
  const currentDate = new Date();
  const diffInMs = currentDate - updatedDate;
  if (diffInMs < 0) return "Edited just now";

  const diffInSeconds = Math.floor(diffInMs / 1000);
  if (diffInSeconds < 60) return "Edited just now";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Edited ${diffInMinutes}min ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Edited ${diffInHours || 1}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `Edited ${diffInDays}d ago`;
  if (diffInDays < 30) return `Edited ${Math.floor(diffInDays / 7)}w ago`;
  const diffInMonths = Math.floor(diffInDays / 30.43);
  if (diffInMonths < 12) return `Edited ${diffInMonths || 1}m ago`;
  return `Edited ${Math.floor(diffInMonths / 12) || 1}y ago`;
}


export default function ProductDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { state: cartState, dispatch } = useContext(CartContext);
  const { wishlistItems, toggleWishlist } = useContext(WishlistContext);
  const { setOpenCanvas, setLoginPopupOpen } = useContext(OffCanvasContext);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [updatingQuantity, setUpdatingQuantity] = useState(false);


  useEffect(() => {
    if (!id) return;

    async function fetchProductDetailsAndAuth() {
      try {
        setLoading(true);
        const { data: prodData, error: prodError } = await supabase
          .from("products")
          .select("id, title, price, image, stock, created_at, updated_at")
          .eq("id", id)
          .maybeSingle();

        if (prodError) throw prodError;
        if (prodData) setProduct(prodData);

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_admin")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile?.is_admin || session.user.app_metadata?.role === "admin") {
            setIsAdmin(true);
          }
        }
      } catch (err) {
        console.error("Product fetch error:", err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProductDetailsAndAuth();
  }, [id]);
  const handleAddToCart = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast("To add items to your cart, Login First", {
        icon: (
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        ),
        duration: 4000,
      });
      setLoginPopupOpen(true);
      return;
    }

    try {
      setAddingToCart(true);
      const cartItem = cartState.find((item) => item.id === product.id);
      const nextQty = cartItem ? (cartItem.quantity || 1) + 1 : 1;

      const { error } = await supabase
        .from("user_carts")
        .upsert(
          { user_id: user.id, product_id: product.id, quantity: nextQty },
          { onConflict: "user_id,product_id" }
        );

      if (error) throw error;

      dispatch({ type: "addProduct", data: product });
      setOpenCanvas(true);
    } catch (err) {
      console.error(err);
    } finally {
      setAddingToCart(false);
    }
  };


  const handleUpdateQuantity = async (amount) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const cartItem = cartState.find((item) => item.id === product.id);
    const targetQty = cartItem.quantity + amount;

    try {
      setUpdatingQuantity(true);
      if (targetQty <= 0) {
        await supabase.from("user_carts").delete().eq("user_id", user.id).eq("product_id", product.id);
      } else {
        await supabase.from("user_carts").update({ quantity: targetQty }).eq("user_id", user.id).eq("product_id", product.id);
      }

      dispatch({
        type: "updateQuantity",
        data: { id: product.id, quantity: targetQty }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingQuantity(false);
    }
  };


  if (loading) return <div className="w-full max-w-7xl mx-auto px-4 py-16 text-center text-sm text-gray-400 animate-pulse">Loading product information sheets...</div>;
  if (!product) return <div className="w-full max-w-7xl mx-auto px-4 py-16 text-center text-sm text-gray-400">Requested item could not be found.</div>;

  const cartItem = cartState.find((item) => item.id === product.id);
  const isItemInCart = !!cartItem;
  const isOutOfStock = product.stock <= 0;
  const isSaved = wishlistItems?.some(item => item.id === product.id);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-pink-600 transition">Home</Link>
        <span>›</span><span className="text-gray-400">Product details</span><span>›</span>
        <span className="text-pink-600 font-medium truncate">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
        <div className="w-full h-[400px] flex items-center justify-center border border-gray-50 rounded-xl p-4 bg-gray-50/30">
          <img src={product.image} alt={product.title} className="max-w-full max-h-full object-contain" />
        </div>

        <div className="flex flex-col justify-between py-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6 leading-snug">{product.title}</h1>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-6">
              <span className="block text-xs text-gray-400 font-medium mb-1">Retail Selling Price</span>
              <span className="text-3xl font-black text-green-600">Rs. {product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="space-y-3 text-sm text-gray-600 border-b border-gray-100 pb-6 mb-6">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700 w-24">Availability:</span>
                {isOutOfStock ? <span className="text-xs font-bold uppercase bg-red-50 text-red-600 px-2 py-0.5 rounded">Out of stock</span> : <span className="text-xs font-bold uppercase bg-green-50 text-green-600 px-2 py-0.5 rounded">In stock ({product.stock} units)</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700 w-24">Category:</span>
                <span className="text-gray-600 text-xs">General Consumer Health</span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-700 w-24">Timeline:</span>
                  <span className="text-xs font-bold text-pink-600 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded">{formatProductAge(product.created_at)}</span>
                  {isAdmin && formatProductEditAge(product.updated_at, product.created_at) && (
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded animate-pulse">{formatProductEditAge(product.updated_at, product.created_at)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin ? (
              <Link href={`/admin/product/${product.id}`} className="block w-full max-w-xs">
                <button className="w-full py-4 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl text-sm transition-all shadow hover:shadow-md uppercase tracking-wider active:scale-[0.99] flex items-center justify-center gap-2">
                  <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
                  Edit Product
                </button>
              </Link>
            ) : isOutOfStock ? (
              <button disabled className="w-full max-w-xs py-4 bg-gray-200 text-gray-400 font-bold rounded-xl text-sm cursor-not-allowed uppercase tracking-wider">Temporarily Unavailable</button>
            ) : isItemInCart ? (
              <div className="flex items-center bg-[#7bc143] text-white rounded-xl px-4 py-3.5 shadow-md justify-between w-full max-w-[210px] select-none">
                <button
                  onClick={() => handleUpdateQuantity(-1)}
                  disabled={updatingQuantity}
                  className="w-6 h-6 flex items-center justify-center font-black text-lg hover:bg-green-600 rounded-full transition disabled:opacity-50"
                >
                  -
                </button>
                <span className="text-xs font-bold tracking-wide min-w-[70px] text-center flex items-center justify-center">
                  {updatingQuantity ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    `${cartItem.quantity} in Cart`
                  )}
                </span>
                <button
                  onClick={() => handleUpdateQuantity(1)}
                  disabled={updatingQuantity || cartItem.quantity >= product.stock}
                  className="w-6 h-6 flex items-center justify-center font-black text-lg hover:bg-green-600 rounded-full transition disabled:opacity-30"
                >
                  +
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="w-full max-w-xs py-4 bg-[#7bc143] hover:bg-green-600 text-white font-bold rounded-xl text-sm transition-all shadow hover:shadow-md uppercase tracking-wider active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-75"
              >
                {addingToCart ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                    </svg>
                    Add to Cart
                  </>
                )}
              </button>
            )}

            {!isAdmin && (
              <button onClick={() => toggleWishlist(product)} className={`p-3.5 border rounded-xl shadow-sm transition-all duration-200 active:scale-95 flex items-center justify-center ${isSaved ? 'border-pink-200 bg-pink-50 text-pink-600' : 'border-gray-200 bg-white text-gray-400 hover:text-pink-600 hover:border-pink-200'}`} title={isSaved ? "Remove from wishlist" : "Save to wishlist"}>
                <svg xmlns="http://w3.org" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
