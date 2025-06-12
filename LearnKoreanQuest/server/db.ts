import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for serverless environments
if (typeof WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

// Skip database setup when using Excel file mode
if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set. Running in Excel file mode.");
}

// Configure connection pooling for better stability
export const pool = process.env.DATABASE_URL ? new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
}) : null;

export const db = pool ? drizzle({ client: pool, schema }) : null;