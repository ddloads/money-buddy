from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Optional, Tuple
from datetime import datetime

from app.core.appwrite_config import appwrite_settings


class AppwriteStorageService:
    """Appwrite storage service for file uploads (receipts)."""
    
    def __init__(self):
        self.settings = appwrite_settings
    
    async def upload_file(
        self, 
        user_id: str, 
        bill_id: str, 
        file_path: Optional[str] = None, 
        filename: Optional[str] = None,
        contents: Optional[bytes] = None
    ) -> Tuple[bool, str]:
        """
        Upload a file to Appwrite storage.
        
        Args:
            user_id: The user's ID (used in filename)
            bill_id: The bill's ID (used in filename)
            file_path: Path to the local file (optional if contents provided)
            filename: Optional custom filename
            contents: File contents as bytes (optional if file_path provided)
            
        Returns:
            Tuple of (success, url_or_error_message)
        """
        try:
            # Validate inputs
            if not file_path and not contents:
                return False, "Either file_path or contents must be provided"
            
            # Read from file path if provided
            if file_path:
                if not os.path.exists(file_path):
                    return False, "File not found"
                
                file_size = os.path.getsize(file_path)
                max_size_bytes = self.settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
                
                if file_size > max_size_bytes:
                    return False, f"File too large (max {self.settings.MAX_UPLOAD_SIZE_MB}MB)"
                
                with open(file_path, 'rb') as f:
                    file_data = f.read()
            else:
                # Use provided contents
                file_data = contents if contents else b''
                file_size = len(file_data)
            
            # Generate unique filename if not provided
            if not filename:
                ext = Path(file_path).suffix.lower() if file_path else ".jpg"
                unique_id = str(uuid.uuid4())[:8]
                filename = f"{user_id}_{bill_id}_{unique_id}{ext}"
            
            # Get file extension
            ext = Path(filename).suffix.lower()
            
            # Validate extension
            if ext not in [f".{e}" for e in self.settings.ALLOWED_EXTENSIONS]:
                return False, f"Invalid file type. Allowed: {', '.join(self.settings.ALLOWED_EXTENSIONS)}"
            
            # Prepare multipart form data
            headers = {
                'x-appwrite-key': self.settings.APPWRITE_API_KEY,
                'content-type': 'multipart/form-data'
            }
            
            bucket_id = self.settings.APPWRITE_STORAGE_BUCKET
            
            # Upload using Appwrite API directly via client.call
            response = self.settings.appwrite_client.call(
                method='post',
                path=f'/storage/buckets/{bucket_id}/files',
                headers=headers,
                params={
                    'file': ('receipt_file', file_data),
                    'filename': filename
                }
            )
            
            if isinstance(response, dict) and 'url' in response:
                return True, response['url']
            else:
                error_msg = str(response).replace('\n', ' ')[:200]
                return False, f"Upload failed: {error_msg}"
                    
        except Exception as e:
            error_msg = str(e)
            if isinstance(e, dict):
                error_msg = str(e.get('message', str(e)))
            return False, f"Upload error: {error_msg}"
    
    async def delete_file(self, file_id: str) -> bool:
        """
        Delete a file from Appwrite storage.
        
        Args:
            file_id: The Appwrite file ID
            
        Returns:
            True if deleted successfully
        """
        try:
            headers = {
                'x-appwrite-key': self.settings.APPWRITE_API_KEY,
            }
            
            response = self.settings.appwrite_client.call(
                method='delete',
                path=f'/storage/buckets/files/{file_id}',
                headers=headers
            )
            
            return isinstance(response, dict) and response.get('success') == True
            
        except Exception as e:
            error_msg = str(e)
            if isinstance(e, dict):
                error_msg = str(e.get('message', str(e)))
            print(f"Failed to delete file {file_id}: {error_msg}")
            return False
    
    async def get_file_url(self, file_id: str) -> Optional[str]:
        """
        Get the public URL for a stored file.
        
        Args:
            file_id: The Appwrite file ID
            
        Returns:
            Public URL or None if not found
        """
        try:
            headers = {
                'x-appwrite-key': self.settings.APPWRITE_API_KEY,
            }
            
            response = self.settings.appwrite_client.call(
                method='get',
                path=f'/storage/buckets/files/{file_id}/view',
                headers=headers
            )
            
            if isinstance(response, dict) and 'url' in response:
                return response['url']
            return None
            
        except Exception as e:
            print(f"Failed to get file URL for {file_id}: {e}")
            return None
    
    async def list_files(
        self, 
        user_id: str = None, 
        bill_id: str = None,
        limit: int = 10
    ) -> list:
        """
        List files from storage (optional filtering).
        
        Args:
            user_id: Filter by user ID
            bill_id: Filter by bill ID  
            limit: Maximum number of results
            
        Returns:
            List of file metadata dicts
        """
        try:
            headers = {
                'x-appwrite-key': self.settings.APPWRITE_API_KEY,
            }
            
            params = {
                'bucketId': self.settings.APPWRITE_STORAGE_BUCKET,
                'limit': limit
            }
            
            if user_id or bill_id:
                # Note: Appwrite storage doesn't have built-in filtering
                # This would require fetching all and filtering client-side
                pass
            
            response = self.settings.appwrite_client.call(
                method='get',
                path='/storage/buckets/files',
                headers=headers,
                params=params
            )
            
            if isinstance(response, list):
                return response[:limit]
            return []
            
        except Exception as e:
            print(f"Failed to list files: {e}")
            return []
