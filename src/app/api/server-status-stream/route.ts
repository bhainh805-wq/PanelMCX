import WebSocket from 'ws';

/**
 * Server-Sent Events endpoint for real-time server status updates
 * 
 * This endpoint creates a server-side WebSocket connection to the main server
 * to receive real-time status updates and forwards them to SSE clients.
 * 
 * Architecture:
 * Main Server (statusManager) → WebSocket → SSE Endpoint → SSE Stream → Frontend
 */
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      let ws: WebSocket | null = null;
      let heartbeatInterval: NodeJS.Timeout | null = null;
      
      try {
        // Create WebSocket client connection to main server
        ws = new WebSocket('ws://localhost:8000/api/terminal-ws');
        
        // Handle WebSocket connection open
        ws.on('open', () => {
          console.log('[SSE] WebSocket connection established');
          
          // Send heartbeat to keep connection alive
          heartbeatInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              // Send ping to keep connection alive
              ws.ping();
            }
          }, 30000); // Every 30 seconds
        });
        
        // Handle incoming WebSocket messages
        ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            
            // Only forward status messages to SSE clients
            if (message.type === 'status') {
              // Map internal status to API format for backward compatibility
              const statusData = message.data;
              let apiStatus: string;
              
              switch (statusData.status) {
                case 'running':
                  apiStatus = 'online';
                  break;
                case 'stopped':
                  apiStatus = 'offline';
                  break;
                case 'starting':
                  apiStatus = 'starting';
                  break;
                case 'stopping':
                  apiStatus = 'stopping';
                  break;
                default:
                  apiStatus = 'offline';
              }
              
              const sseData = {
                status: apiStatus,
                checks: {
                  process: {
                    running: statusData.processFound,
                    pid: statusData.pid,
                  },
                  port: {
                    listening: statusData.status === 'running',
                    port: 25565,
                  },
                },
                timestamp: statusData.timestamp,
              };
              
              // Send to SSE client
              const sseMessage = `data: ${JSON.stringify(sseData)}\n\n`;
              controller.enqueue(encoder.encode(sseMessage));
            }
          } catch (error) {
            console.error('[SSE] Error processing WebSocket message:', error);
          }
        });
        
        // Handle WebSocket errors
        ws.on('error', (error) => {
          console.error('[SSE] WebSocket error:', error);
        });
        
        // Handle WebSocket close
        ws.on('close', () => {
          console.log('[SSE] WebSocket connection closed');
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
          }
        });
        
      } catch (error) {
        console.error('[SSE] Failed to create WebSocket connection:', error);
      }
      
      // Clean up on SSE connection close
      request.signal.addEventListener('abort', () => {
        console.log('[SSE] Client disconnected, cleaning up');
        
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
        
        if (ws) {
          ws.close();
        }
        
        controller.close();
      });
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
