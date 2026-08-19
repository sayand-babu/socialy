import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  listing: null, // listing for which chat is opened
  isOpen: false, // chat modal / panel open state
  chatId: null, // existing chat id (if any)
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setChat: (state, action) => {
      state.listing = action.payload.listing;
      state.isOpen = true;
      state.chatId = action.payload.chatId || null;
    },

    clearChat: (state) => {
      state.listing = null;
      state.isOpen = false;
      state.chatId = null;
    },
  },
});

export const { setChat, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
