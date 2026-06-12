# Appwrite Integration Summary for Money Buddy

## ✅ What Was Added

### New Files Created

1. **`backend/app/core/appwrite_config.py`** (54 lines)
   - Configuration management using Pydantic Settings
   - Lazy client initialization with LRU cache
   - Environment variable validation

2. **`backend/app/services/appwrite.py`** (221 lines)
   - `AppwriteStorageService` class for cloud storage operations
   - Methods: `upload_file()`, `delete_file()`, `get_file_url()`
   - Automatic file ID extraction from URLs
   - Error handling with fallback logging

### Files Modified

3. **`backend/.env.example`**
   - Added Appwrite configuration section
   - New variables: `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`
   - Optional bucket and collection settings

4. **`backend/app/models/bill.py`**
   - Added `receipt_url` field (String(512))
   - Kept existing `receipt_path` for backward compatibility
   - Supports both local and cloud storage simultaneously during migration

5. **`backend/app/api/bills.py`**
   - Updated `upload_receipt()` endpoint with Appwrite integration
   - Dual-path logic: Try Appwrite → Fall back to local if fails
   - Passes file contents directly (no temp files needed)
   - Stores cloud URL in `receipt_url`, clears `receipt_path`

6. **`backend/app/api/auth.py`**
   - Enhanced user deletion cleanup
   - Deletes both local files AND Appwrite storage files
   - Extracts file ID from Appwrite URLs for proper deletion

7. **`backend/app/api/bills.py` (delete_bill endpoint)**
   - Added Appwrite file deletion when deleting bills
   - Handles both `receipt_path` and `receipt_url` cleanup

## 🔑 Configuration Keys Used

From your provided keys file:

```bash
# Add to backend/.env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=4aa9a0c0911a8dc1e0fdf7310a69c28d4d3139ed0e40a7cd90f19e12cdceb14a
APPWRITE_API_KEY=<need_to_create_this>
```

⚠️ **Note:** The Appwrite API key needs to be created in your Appwrite dashboard. It's not the same as your project ID.

## 📋 Setup Steps

### 1. Create Appwrite Project (if you don't have one)
- Go to https://app.appwrite.io
- Sign up/login
- Create a new project

### 2. Get Your Credentials
```bash
# In Appwrite Dashboard:
Project ID → Copy from Settings
API Key → Generate in Settings → API Keys
```

### 3. Configure Environment Variables
Edit `backend/.env`:
```bash
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=4aa9a0c0911a8dc1e0fdf7310a69c28d4d3139ed0e40a7cd90f19e12cdceb14a
APPWRITE_API_KEY=<your_api_key_here>
```

### 4. Create Storage Bucket
In Appwrite Dashboard:
- Go to **Storage** → **Buckets**
- Click **Create bucket**
- Name it `money-buddy` (or any name you prefer)
- Set permissions as needed

## 🎯 How It Works

### Upload Flow
```
User uploads receipt → Check Appwrite config → 
  ├─ Success: Upload to Appwrite, store URL in DB
  └─ Fail: Save locally in /uploads/, store path in DB
```

### Delete Flow
```
Delete bill/user → Find all receipts (local + cloud) → 
  ├─ Local files: os.remove()
  └─ Cloud URLs: Extract file ID, delete_file()
```

## 📊 Database Changes

**Before:**
```python
receipt_path: Optional[str]  # Local file path only
```

**After:**
```python
receipt_path: Optional[str]  # Local file (deprecated)
receipt_url: Optional[str]   # Cloud storage URL (Appwrite, etc.)
```

## 🧪 Testing

### Test with Appwrite
```bash
cd backend
# Make sure .env has your credentials
docker compose up --build backend
```

Upload a receipt → Check response includes `receipt_url` field.

### Test without Appwrite (fallback)
```bash
# Remove or comment out Appwrite config in .env
APPWRITE_PROJECT_ID=
APPWRITE_API_KEY=
docker compose restart backend
```

Upload a receipt → File saves locally to `/uploads/`.

## 📖 Documentation

Full documentation available at: `money-buddy/APPWRITE_INTEGRATION.md`

## 🔒 Security Notes

- API key should have **Storage-only** permissions (not full project access)
- Never commit `.env` file to version control
- Consider using Appwrite Functions for more secure integration in future

## 🚀 Next Steps

1. Add your Appwrite API key to `backend/.env`
2. Create a storage bucket in Appwrite dashboard
3. Test receipt upload with both local and cloud paths
4. Monitor logs: `docker compose logs backend | grep -i appwrite`

---

**Integration completed successfully!** 🎉

All code is backward compatible - existing bills continue to work without changes.
