# Call Logs API Documentation

## Create Call Log
**POST** `/api/call-logs/:id` or `/api/leads/:id/call`

Creates a new call log for a lead or lead activity. Can handle both optional payload data and recording file upload in a single request.

### Parameters
- `id` (path parameter): Lead ID or Lead Activity ID

### Request Body (multipart/form-data)
**Optional Text Fields:**
- `callStartTime`: ISO date string (e.g., "2025-03-14T10:30:00.000Z")
- `callEndTime`: ISO date string (e.g., "2025-03-14T10:32:45.000Z")
- `durationSeconds`: Number (e.g., 165)
- `comment`: String (e.g., "Optional notes about the call")

**Optional File Field:**
- `recording`: Audio/video file (mp3, wav, m4a, aac, ogg, webm, mp4)
- Max file size: 100MB

### Response
```json
{
  "success": true,
  "message": "Call log created successfully",
  "data": {
    "callLog": {
      "_id": "...",
      "callId": "CALL000001",
      "userId": "...",
      "leadId": "...",
      "dateTime": "2025-03-14T10:30:00.000Z",
      "callStartTime": "2025-03-14T10:30:00.000Z",
      "callEndTime": "2025-03-14T10:32:45.000Z",
      "durationSeconds": 165,
      "comment": "Optional notes about the call",
      "recording": "uploads/recordings/recording-1234567890-123456789.mp3",
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

## Download Recording
**GET** `/api/call-logs/:id/recording` or `/api/leads/call/:id/recording`

Downloads the recording file for a call log.

### Parameters
- `id` (path parameter): Call Log ID

### Response
- File download with appropriate headers

## Get All Call Logs
**GET** `/api/call-logs`

Retrieves all call logs with pagination and filtering.

### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date
- `userId` (optional): Filter by user ID
- `search` (optional): Search by call ID

## Export Call Logs
**GET** `/api/call-logs/export`

Exports call logs as CSV file.

### Query Parameters
Same as Get All Call Logs endpoint.

## Usage Examples

### 1. Create a basic call log (no payload, no recording)
```bash
curl -X POST http://localhost:3000/api/leads/LEAD_ID/call \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Create call log with details only (no recording)
```bash
curl -X POST http://localhost:3000/api/leads/LEAD_ID/call \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "callStartTime=2025-03-14T10:30:00.000Z" \
  -F "callEndTime=2025-03-14T10:32:45.000Z" \
  -F "durationSeconds=165" \
  -F "comment=Discussed project requirements"
```

### 3. Create call log with recording only (no other details)
```bash
curl -X POST http://localhost:3000/api/leads/LEAD_ID/call \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "recording=@/path/to/recording.mp3"
```

### 4. Create call log with both details and recording
```bash
curl -X POST http://localhost:3000/api/leads/LEAD_ID/call \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "callStartTime=2025-03-14T10:30:00.000Z" \
  -F "callEndTime=2025-03-14T10:32:45.000Z" \
  -F "durationSeconds=165" \
  -F "comment=Discussed project requirements" \
  -F "recording=@/path/to/recording.mp3"
```

### 5. Download recording
```bash
curl -X GET http://localhost:3000/api/leads/call/CALL_LOG_ID/recording \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o downloaded_recording.mp3
```

## JavaScript/Frontend Examples

### Using FormData for file upload with details
```javascript
const formData = new FormData();
formData.append('callStartTime', '2025-03-14T10:30:00.000Z');
formData.append('callEndTime', '2025-03-14T10:32:45.000Z');
formData.append('durationSeconds', 165);
formData.append('comment', 'Discussed project requirements');
formData.append('recording', recordingFile); // File object

fetch('/api/leads/LEAD_ID/call', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

### Using fetch for basic call log (no file)
```javascript
fetch('/api/leads/LEAD_ID/call', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    callStartTime: '2025-03-14T10:30:00.000Z',
    callEndTime: '2025-03-14T10:32:45.000Z',
    durationSeconds: 165,
    comment: 'Discussed project requirements'
  })
})
.then(response => response.json())
.then(data => console.log(data));
```