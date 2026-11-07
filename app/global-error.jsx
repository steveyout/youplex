'use client';

import { useEffect } from 'react';

// ----------------------------------------------------------------------

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('[GlobalError] Unhandled error captured by root boundary:', error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Error - VidSrc & Youplex</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background-color: #050709;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 24px;
          }
          .container {
            max-width: 480px;
            text-align: center;
            background: #0f1217;
            border: 1px solid #1f2937;
            border-radius: 16px;
            padding: 36px 28px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.6);
          }
          .icon {
            font-size: 40px;
            margin-bottom: 16px;
          }
          h1 {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 8px;
            color: #ffffff;
          }
          p {
            font-size: 14px;
            color: #9ca3af;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .actions {
            display: flex;
            gap: 12px;
            justify-content: center;
          }
          button {
            background: #FF3030;
            color: #ffffff;
            border: none;
            padding: 10px 24px;
            font-size: 14px;
            font-weight: 600;
            border-radius: 8px;
            cursor: pointer;
            transition: opacity 0.2s;
          }
          button:hover {
            opacity: 0.9;
          }
          .btn-secondary {
            background: #1f2937;
            color: #e5e7eb;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="icon">⚠️</div>
          <h1>Something went wrong</h1>
          <p>
            An unexpected error occurred while loading this view. You can reload or return to the main player.
          </p>
          <div className="actions">
            <button onClick={() => reset()}>Try Again</button>
            <button className="btn-secondary" onClick={() => window.location.reload()}>
              Reload Page
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
