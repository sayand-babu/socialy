import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getPublicListings, getUserListings } from "../../services/listingService";

/**
 * Async thunk to fetch public listings from the backend
 */
export const fetchPublicListings = createAsyncThunk(
  "listing/fetchPublicListings",
  async (_, { rejectWithValue }) => {
    try {
      const listings = await getPublicListings();
      return listings;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch listings"
      );
    }
  }
);

/**
 * Async thunk to fetch user's listings
 */
export const fetchUserListings = createAsyncThunk(
  "listing/fetchUserListings",
  async (token, { rejectWithValue }) => {
    try {
      const data = await getUserListings(token);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch user listings"
      );
    }
  }
);

const listingSlice = createSlice({
  name: "listing",
  initialState: {
    listings: [],
    userListings: [],
    loading: false,
    error: null,
    balance: {
      earned: 0,
      withdrawn: 0,
      available: 0,
    },
  },
  reducers: {
    setListings: (state, action) => {
      state.listings = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch public listings
    builder
      .addCase(fetchPublicListings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublicListings.fulfilled, (state, action) => {
        state.loading = false;
        state.listings = action.payload;
      })
      .addCase(fetchPublicListings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch user listings
    builder
      .addCase(fetchUserListings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserListings.fulfilled, (state, action) => {
        state.loading = false;
        state.userListings = action.payload.listings || [];
        state.balance = action.payload.balance || state.balance;
      })
      .addCase(fetchUserListings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setListings, clearError } = listingSlice.actions;

export default listingSlice.reducer;
