"use client";

import React, { createContext, useReducer, useEffect } from "react";
import cartReducer from "@/Reducers/Cart";
import { supabase } from "@/Config/supabase";

const CartContext = createContext();

function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, []);

    useEffect(() => {
    let isTabActive = true;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isTabActive = false;
      } else {
        setTimeout(() => {
          isTabActive = true;
        }, 100);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    async function fetchDatabaseCartItems(userInstanceId) {
      if (!isTabActive) return;

      try {
        const { data: databaseCart, error } = await supabase
          .from("user_carts")
          .select("quantity, products(id, title, price, image, stock)")
          .eq("user_id", userInstanceId);

        if (!error && databaseCart) {
          const formattedItems = databaseCart
            .map((item) => {
              if (!item.products) return null;
              return { ...item.products, quantity: item.quantity };
            })
            .filter(Boolean);

          dispatch({ type: "SET_CART", payload: formattedItems });
        }
      } catch (err) {
        console.error(err.message);
      }
    }

    async function initialLoad() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchDatabaseCartItems(session.user.id);
      }
    }
    initialLoad();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        await fetchDatabaseCartItems(session.user.id);
      } else if (event === "SIGNED_OUT") {
        dispatch({ type: "deleteAllProduct" });
      }
    });

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      subscription.unsubscribe();
    };
  }, []);


  const hasPrescription = state.some((item) => item.requiresPrescription === true);

  return (
    <CartContext.Provider value={{ state, dispatch, hasPrescription }}>
      {children}
    </CartContext.Provider>
  );
}

export { CartContext, CartProvider };
