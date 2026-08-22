# Quick Start - Marketplace Backend Integration

## Environment Setup

### Client (.env.local)
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
VITE_API_URL=http://localhost:3000/api
VITE_CURRENCY=$
```

### Server (.env)
```env
PORT=3000
NODE_ENV=development
# Database credentials
# Clerk API key
```

---

## Running the Application

### Terminal 1: Start Backend
```bash
cd server
npm install    # (if not done)
npm run server # Uses nodemon
```
Expected output: `Server running on port 3000`

### Terminal 2: Start Frontend
```bash
cd client
npm install    # (if not done)
npm run dev    # Uses Vite dev server
```
Expected output: `Local:   http://localhost:5173/`

---

## Testing the Integration

### 1. Verify Backend Endpoint Works
```bash
# In new terminal, test the API directly
curl http://localhost:3000/api/listings/public
```
Expected response:
```json
{
  "listings": [
    {
      "id": "uuid...",
      "title": "Tech YouTube Channel",
      "platform": "youtube",
      "username": "techsavvy",
      "followers_count": 120000,
      "engagement_rate": 4.5,
      "monthly_views": 850000,
      "price": 7500,
      "status": "active",
      "owner": {...},
      ...
    },
    ...
  ]
}
```

### 2. Visit Marketplace
- Open http://localhost:5173/marketplace
- Should see:
  - Loading spinner briefly
  - Real listings from database
  - Filters and search working
  - ListingCard with correct field values

### 3. Test Error Handling
- Stop the backend server
- Reload marketplace
- Should see error message with "Try Again" button
- Clicking "Try Again" should retry the fetch

### 4. Test Filters
- Platform filter
- Price range filter
- Followers count filter
- Niche filter
- Verified filter
- Monetized filter
- Search functionality

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `client/src/services/api.js` | Axios instance config |
| `client/src/services/listingService.js` | API calls wrapper |
| `client/src/app/features/ListingSlice.js` | Redux state + thunks |
| `client/src/pages/MarketPlace.jsx` | Marketplace component |
| `server/Routes/listingRoutes.js` | Backend routes |
| `server/Controllers/listingController.js` | Backend logic |

---

## Troubleshooting

### "Failed to fetch listings" error
1. Check if backend is running on port 3000
2. Check console for actual error: `Browser DevTools → Console → Network`
3. Test endpoint: `curl http://localhost:3000/api/listings/public`

### Listings show but filters don't work
- Check browser console for JavaScript errors
- Verify field names match backend schema (followers_count, not followers)

### CORS error
- Backend has `cors()` middleware enabled
- Check `server.js` for CORS configuration
- Ensure backend is accessible from frontend URL

### Blank page, no loading spinner
- Check if Redux is properly connected
- Verify `store.js` includes ListingSlice reducer
- Check browser DevTools → React tab for Redux state

---

## Redux State Structure

```javascript
state.listing = {
  listings: [
    {
      id: "uuid",
      title: "string",
      platform: "youtube|instagram|tiktok|...",
      username: "string",
      followers_count: number,
      engagement_rate: number,
      monthly_views: number,
      niche: "string",
      price: number,
      description: "string",
      verified: boolean,
      monetized: boolean,
      country: "string",
      age_range: "string",
      status: "active|inactive|sold|deleted|ban",
      featured: boolean,
      images: ["url1", "url2", ...],
      createdAt: "ISO-8601",
      updatedAt: "ISO-8601",
      owner: {
        id: "string",
        name: "string",
        email: "string",
        image: "string",
        ...
      },
    },
    ...
  ],
  loading: boolean,
  error: string | null,
  balance: {
    earned: number,
    withdrawn: number,
    available: number,
  },
  userListings: [],
}
```

---

## API Routes Available

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/listings/public` | No | Get all active listings |
| POST | `/api/listings/` | Yes | Create new listing |
| PUT | `/api/listings/` | Yes | Update listing |
| GET | `/api/listings/user` | Yes | Get user's listings + balance |
| PUT | `/api/listings/:id/status` | Yes | Toggle listing status |
| DELETE | `/api/listings/:listingid` | Yes | Delete listing |
| POST | `/api/listings/add-credential` | Yes | Submit credentials |
| PUT | `/api/listings/featured/:id` | Yes | Mark as featured |
| GET | `/api/listings/user-orders` | Yes | Get user's orders |
| POST | `/api/listings/withdraw` | Yes | Submit withdrawal |

---

## Common Issues & Solutions

### Issue: "cannot find module" for services
**Solution**: Verify files created at:
- `c:/Users/dalah/socialy/client/src/services/api.js`
- `c:/Users/dalah/socialy/client/src/services/listingService.js`

### Issue: Redux state shows empty listings
**Solution**: Check if thunk dispatched, look at Redux DevTools:
- Should show: `fetchPublicListings/pending` → `fulfilled`
- If shows `rejected`: check error message

### Issue: "localhost:3000" is refused
**Solution**: Backend not running
```bash
cd server && npm run server
```

### Issue: Marketplace shows real data but filters broken
**Solution**: Field name mismatch
- Use `followers_count`, not `followers`
- Use `engagement_rate`, not `engagement`
- Check against Prisma schema

---

## Next Steps (Optional)

1. **Fetch on App Init**:
   - Move `fetchPublicListings` call to `App.jsx` useEffect
   - Ensures data ready when user visits home page

2. **Add Caching**:
   - Store last fetch time in Redux
   - Only refetch if > 5 minutes old

3. **Pagination**:
   - Add limit/offset to `getPublicListings()`
   - Backend already supports this

4. **Admin Dashboard Integration**:
   - Create `fetchAllListings` thunk for admins
   - Create `fetchDashboardStats` thunk
   - Replace dummy data in admin pages

5. **Error Boundary**:
   - Wrap marketplace in error boundary
   - Handle API failures gracefully

---

Generated: 2026-08-18
Status: ✅ Ready to Use
