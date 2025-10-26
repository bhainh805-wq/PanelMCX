# Client-Side Requests Documentation

This document lists all client-side API requests and WebSocket connections in the PanelMCX application.

## HTTP/HTTPS Requests (fetch)

### 1. Dashboard Page (`src/app/page.tsx`)

#### Check Server Status
- **Endpoint**: `/api/check-server`
- **Method**: GET
- **Frequency**: Every 3 seconds (polling)
- **Purpose**: Check if Minecraft server is online/offline/starting/stopping
- **Response**: `{ status: 'online' | 'offline' | 'starting' | 'stopping' | 'preparing' }`

#### Get Config Panel
- **Endpoint**: `/api/config-panel`
- **Method**: GET
- **Cache**: no-store
- **Purpose**: Load server IPs (JAVA_IP, BEDROCK_IP) from config.panel
- **Response**: `{ JAVA_IP: string, BEDROCK_IP: string, ... }`

#### Get Start Command
- **Endpoint**: `/api/config-panel?mode=command`
- **Method**: GET
- **Cache**: no-store
- **Purpose**: Get the server start command built from config.panel
- **Response**: `{ command: string }`

---

### 2. Files Page (`src/app/files/page.tsx`)

#### Check Server Status
- **Endpoint**: `/api/check-server`
- **Method**: GET
- **Frequency**: Every 5 seconds (polling)
- **Purpose**: Determine if edit/delete buttons should be disabled
- **Response**: `{ status: 'online' | 'offline' | 'starting' | 'stopping' }`

#### List Files/Directories
- **Endpoint**: `/api/list-mc` or `/api/list-mc?path={relativePath}`
- **Method**: GET
- **Purpose**: List files and folders in the Minecraft server directory
- **Query Params**:
  - `path` (optional): Relative path within MC_DIR
- **Response**: `{ entries: Array<{ name: string, isDir: boolean, size: number, mtime: number }> }`

#### Upload Files
- **Endpoint**: `/api/upload-mc` or `/api/upload-mc?path={relativePath}`
- **Method**: POST
- **Body**: FormData with files
- **Purpose**: Upload files to the Minecraft server directory
- **Response**: Success/error status

#### Get File Content
- **Endpoint**: `/api/mc-file?path={encodedPath}`
- **Method**: GET
- **Purpose**: Read file content for viewing or editing
- **Query Params**:
  - `path` (required): URL-encoded file path
- **Response**: `{ content: string }`

#### Download File
- **Endpoint**: `/api/mc-file?path={encodedPath}&download=1`
- **Method**: GET
- **Purpose**: Download a file
- **Query Params**:
  - `path` (required): URL-encoded file path
  - `download`: Set to 1 to trigger download
- **Response**: File binary data

#### Save File (Edit)
- **Endpoint**: `/api/mc-file`
- **Method**: PUT
- **Headers**: `Content-Type: application/json`
- **Body**: `{ path: string, content: string }`
- **Purpose**: Save edited file content
- **Response**: Success/error status

#### Delete File/Folder
- **Endpoint**: `/api/mc-file?path={encodedPath}`
- **Method**: DELETE
- **Purpose**: Delete a file or folder
- **Query Params**:
  - `path` (required): URL-encoded file path
- **Response**: Success/error status

---

### 3. Config Page (`src/app/config/page.tsx`)

#### Get Config Panel
- **Endpoint**: `/api/config-panel`
- **Method**: GET
- **Cache**: no-store
- **Purpose**: Load current configuration from config.panel
- **Response**: `{ JAR_NAME: string, MC_DIR: string, MIN_RAM: string, MAX_RAM: string, JAVA_IP: string, BEDROCK_IP: string, ENABLE_PINGGY: boolean, ENABLE_PLAYIT: boolean }`

#### Update Config Panel
- **Endpoint**: `/api/config-panel`
- **Method**: POST
- **Headers**: `Content-Type: application/json`
- **Body**: Configuration object
- **Purpose**: Save updated configuration to config.panel
- **Response**: Success/error status

---

## WebSocket Connections

### Terminal WebSocket (`src/app/terminal/wsSession.ts`)

#### Connection
- **Endpoint**: `/api/terminal-ws`
- **Protocol**: WebSocket (ws:// or wss://)
- **Purpose**: Real-time terminal communication
- **Singleton**: Only one connection is maintained across the app

#### Messages Sent (Client → Server)

1. **Terminal Input**
   ```json
   {
     "type": "input",
     "data": "command string"
   }
   ```

2. **Panel Action (Start)**
   ```json
   {
     "type": "panel-action",
     "action": "start"
   }
   ```

3. **Panel Action (Stop)**
   ```json
   {
     "type": "panel-action",
     "action": "stop"
   }
   ```

#### Messages Received (Server → Client)

1. **Terminal Output**
   ```json
   {
     "type": "output",
     "data": "terminal output string"
   }
   ```

2. **Uptime Update**
   ```json
   {
     "type": "uptime",
     "seconds": 12345
   }
   ```

#### Usage Locations

1. **Dashboard Page** (`src/app/page.tsx`)
   - Sends server start/stop commands
   - Receives uptime updates
   - Sends Ctrl+C to stop server

2. **Terminal Page** (`src/app/terminal/page.tsx`)
   - Full terminal interaction
   - Sends user input
   - Receives and displays output
   - Handles terminal resize events

---

## Request Summary by Feature

### Server Control
- ✅ Check server status (polling)
- ✅ Get start command
- ✅ Send start command via WebSocket
- ✅ Send stop command (Ctrl+C) via WebSocket
- ✅ Receive uptime updates via WebSocket

### File Management
- ✅ List files and directories
- ✅ Upload files
- ✅ Download files
- ✅ View file content
- ✅ Edit file content
- ✅ Delete files/folders
- ✅ Check server status (for disabling edit/delete)

### Configuration
- ✅ Read configuration
- ✅ Update configuration

### Terminal
- ✅ Real-time terminal I/O via WebSocket
- ✅ Send commands
- ✅ Receive output
- ✅ Terminal resize handling

---

## Polling Intervals

| Feature | Endpoint | Interval | Location |
|---------|----------|----------|----------|
| Server Status (Dashboard) | `/api/check-server` | 3 seconds | `src/app/page.tsx` |
| Server Status (Files) | `/api/check-server` | 5 seconds | `src/app/files/page.tsx` |

---

## Error Handling

All fetch requests include try-catch blocks and show toast notifications:
- ✅ Success toasts (green)
- ✅ Error toasts (red)
- ✅ Info toasts (blue)

WebSocket includes:
- ✅ Connection error handling
- ✅ Automatic reconnection logic
- ✅ Singleton pattern to prevent multiple connections

---

## Security Considerations

1. **Path Encoding**: All file paths are URL-encoded before sending
2. **Server Status Check**: Edit/delete operations are disabled when server is running
3. **Upload Restrictions**: Uploads disabled when server is busy
4. **WebSocket**: Single connection per session
5. **No-Store Cache**: Sensitive config data uses `cache: 'no-store'`

---

## API Endpoints Summary

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/check-server` | GET | Check Minecraft server status |
| `/api/config-panel` | GET, POST | Read/write config.panel |
| `/api/list-mc` | GET | List files in MC directory |
| `/api/upload-mc` | POST | Upload files to MC directory |
| `/api/mc-file` | GET, PUT, DELETE | Read/edit/delete files |
| `/api/terminal-ws` | WebSocket | Real-time terminal communication |

---

*Last Updated: 2024*
