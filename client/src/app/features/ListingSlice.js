import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getPublicListings, getUserListings } from "../../services/listingService";

/**
 * Async thunk to fetch public listings from the backend with filters, sort and pagination
 */
export const fetchPublicListings = createAsyncThunk(
  "listing/fetchPublicListings",
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await getPublicListings(params);
      return data;
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
    pagination: {
      total: 0,
      page: 1,
      limit: 12,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
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
    setUserListings: (state, action) => {
      state.userListings = action.payload;
    },
    updateUserListingItem: (state, action) => {
      const updated = action.payload;
      state.userListings = state.userListings.map((item) =>
        item.id === updated.id ? { ...item, ...updated } : item
      );
      state.listings = state.listings.map((item) =>
        item.id === updated.id ? { ...item, ...updated } : item
      );
    },
    removeUserListingItem: (state, action) => {
      const listingId = action.payload;
      state.userListings = state.userListings.filter((item) => item.id !== listingId);
      state.listings = state.listings.filter((item) => item.id !== listingId);
    },
    setUserBalance: (state, action) => {
      state.balance = action.payload;
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
        state.listings = action.payload?.listings || (Array.isArray(action.payload) ? action.payload : []);
        state.pagination = action.payload?.pagination || state.pagination;
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

export const {
  setListings,
  setUserListings,
  updateUserListingItem,
  removeUserListingItem,
  setUserBalance,
  clearError,
} = listingSlice.actions;

export default listingSlice.reducer;
