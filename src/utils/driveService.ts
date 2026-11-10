export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
}

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

export class DriveService {
  // Find or create a dedicated 'OmniStudio Vault' folder in Google Drive
  public static async getOrCreateAppFolder(token: string): Promise<string> {
    try {
      const q = encodeURIComponent("name = 'OmniStudio Vault' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
      const checkRes = await fetch(`${DRIVE_API_URL}?q=${q}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (checkRes.ok) {
        const data = await checkRes.json();
        if (data.files && data.files.length > 0) {
          return data.files[0].id;
        }
      }

      // Create folder if not found
      const createRes = await fetch(DRIVE_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'OmniStudio Vault',
          mimeType: 'application/vnd.google-apps.folder',
          description: 'Cloud assets and project files saved from OmniStudio Engine'
        })
      });

      if (createRes.ok) {
        const folder = await createRes.json();
        return folder.id;
      }
    } catch (e) {
      console.warn('Error creating app folder in Drive:', e);
    }
    return '';
  }

  // List files inside folder or search user files
  public static async listFiles(
    token: string,
    folderId?: string,
    searchQuery?: string
  ): Promise<DriveFileItem[]> {
    let q = 'trashed = false';
    if (folderId) {
      q += ` and '${folderId}' in parents`;
    }
    if (searchQuery) {
      q += ` and name contains '${searchQuery.replace(/'/g, "\\'")}'`;
    }

    const fields = 'files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)';
    const url = `${DRIVE_API_URL}?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&orderBy=modifiedTime desc&pageSize=50`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Drive list error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    return data.files || [];
  }

  // Upload file (JSON, SVG, WAV, ZIP, HTML) to Google Drive via multipart upload
  public static async uploadFile(
    token: string,
    fileName: string,
    mimeType: string,
    content: string | Blob,
    folderId?: string
  ): Promise<DriveFileItem> {
    const metadata: { name: string; mimeType: string; parents?: string[] } = {
      name: fileName,
      mimeType
    };
    if (folderId) {
      metadata.parents = [folderId];
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    let bodyData: Blob;

    if (typeof content === 'string') {
      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        content +
        closeDelimiter;

      bodyData = new Blob([multipartRequestBody], { type: `multipart/related; boundary=${boundary}` });
    } else {
      // Binary content (WAV, ZIP, etc.)
      const metadataPart = new Blob(
        [
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${mimeType}\r\n\r\n`
        ],
        { type: 'text/plain' }
      );
      const closePart = new Blob([closeDelimiter], { type: 'text/plain' });
      bodyData = new Blob([metadataPart, content, closePart], { type: `multipart/related; boundary=${boundary}` });
    }

    const res = await fetch(DRIVE_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: bodyData
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive upload failed: ${res.status} ${err}`);
    }

    return await res.json();
  }

  // Download file content from Google Drive
  public static async downloadFileText(token: string, fileId: string): Promise<string> {
    const res = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      throw new Error(`Drive download failed: ${res.status}`);
    }

    return await res.text();
  }

  // Delete file from Google Drive (MUST be guarded with explicit user confirmation in UI!)
  public static async deleteFile(token: string, fileId: string): Promise<void> {
    const res = await fetch(`${DRIVE_API_URL}/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok && res.status !== 404) {
      throw new Error(`Drive delete failed: ${res.status}`);
    }
  }
}
