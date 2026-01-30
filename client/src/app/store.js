import { configureStore } from "@reduxjs/toolkit";
import listingReducer from "./features/ListingSlice";

export const store = configureStore({
  reducer: {
    listing: listingReducer,
  },
});
