import { configureStore } from "@reduxjs/toolkit";
import listingReducer from "./features/ListingSlice";
import chatReducer from "./features/ChatSlice";

export const store = configureStore({
  reducer: {
    listing: listingReducer,
    chat: chatReducer,
  },
});
