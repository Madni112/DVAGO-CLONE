"use client";

import React, { createContext, useState } from "react";

export const OffCanvasContext = createContext();

export function OffCanvasProvider({ children }) {
  const [isOpenCanvas, setOpenCanvas] = useState(false);
  const [isLoginPopupOpen, setLoginPopupOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);


  return (
    <OffCanvasContext.Provider 
      value={{ 
        isOpenCanvas, 
        setOpenCanvas, 
        isLoginPopupOpen, 
        setLoginPopupOpen,
        isWishlistOpen,
        setIsWishlistOpen
      }}
    >
      {children}
    </OffCanvasContext.Provider>
  );
}
