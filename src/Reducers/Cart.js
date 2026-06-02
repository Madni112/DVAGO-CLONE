function cartReducer(state, action) {
  switch (action.type) {
    case "SET_CART": {
      return action.payload;
    }

    case "addProduct": {
      const existingProduct = state.find((item) => item.id === action.data.id);

      if (existingProduct) {
        return state.map((item) =>
          item.id === action.data.id
            ? { ...item, quantity: (item.quantity || 1) + 1 }
            : item
        );
      }
      return [...state, { ...action.data, quantity: 1 }];
    }

    case "updateQuantity": {
      const { id, quantity } = action.data;
      
      if (quantity <= 0) {
        return state.filter((item) => item.id !== id);
      }
      
      return state.map((item) =>
        item.id === id ? { ...item, quantity: quantity } : item
      );
    }

    case "deleteProduct": {
      const id = action.data.id;
      return state.filter((v) => v.id !== id);
    }

    case "deleteAllProduct":
      return [];

    default:
      return state;
  }
}

export default cartReducer;
