import { NextResponse } from 'next/server';
import { statusManager } from '@/lib/statusManager';

/**
 * GET /api/server/status
 * 
 * Returns the current Minecraft server status using the centralized status manager
 * 
 * Query Parameters:
 *   - format: 'simple' | 'detailed' (default: 'simple')
 *   - port: number (optional, for compatibility)
 * 
 * Response Format (simple):
 * {
 *   status: 'online' | 'offline' | 'starting' | 'stopping',
 *   checks: {
 *     process: { running: boolean, pid?: number },
 *     port: { listening: boolean, port: number }
 *   },
 *   timestamp: string
 * }
 * 
 * Response Format (detailed):
 * {
 *   status: 'stopped' | 'starting' | 'running' | 'stopping',
 *   processFound: boolean,
 *   pid?: number,
 *   timestamp: string
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'simple';
    const port = parseInt(searchParams.get('port') || '25565');

    // Validate port
    if (isNaN(port) || port < 1 || port > 65535) {
      return NextResponse.json(
        { error: 'Invalid port number' },
        { status: 400 }
      );
    }

    // Get status from manager
    const statusInfo = statusManager.getStatusInfo();

    if (format === 'detailed') {
      // Return detailed format with internal status
      return NextResponse.json(statusInfo, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } else {
      // Return simple format with mapped status
      let apiStatus: string;
      switch (statusInfo.status) {
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

      const simpleStatus = {
        status: apiStatus,
        checks: {
          process: {
            running: statusInfo.processFound,
            pid: statusInfo.pid,
          },
          port: {
            listening: statusInfo.status === 'running',
            port: port,
          },
        },
        timestamp: statusInfo.timestamp,
      };

      return NextResponse.json(simpleStatus, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
  } catch (error: any) {
    console.error('[Server Status API] Error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to check server status',
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
