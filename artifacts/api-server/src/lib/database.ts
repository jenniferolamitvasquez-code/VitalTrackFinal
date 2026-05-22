import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { logger } from "./logger";

let memoryServer: MongoMemoryServer | undefined;

export async function connectDatabase(): Promise<void> {
  const mongodbUri = process.env.MONGODB_URI;

  if (!mongodbUri) {
    throw new Error(
      "MONGODB_URI environment variable is required but was not provided.",
    );
  }

  try {
    await mongoose.connect(mongodbUri);
    logger.info("Connected to MongoDB");
  } catch (err) {
    if (!shouldUseMemoryFallback(mongodbUri)) {
      throw err;
    }

    logger.warn(
      { err },
      "Local MongoDB is unavailable; starting embedded MongoDB for development",
    );

    memoryServer = await MongoMemoryServer.create();
    await mongoose.connect(memoryServer.getUri());
    logger.info("Connected to embedded MongoDB");
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  await memoryServer?.stop();
  memoryServer = undefined;
}

function shouldUseMemoryFallback(mongodbUri: string): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  if (process.env.MONGODB_MEMORY_FALLBACK === "false") {
    return false;
  }

  return /mongodb:\/\/(?:localhost|127\.0\.0\.1|\[?::1\]?)(?::\d+)?\//.test(
    mongodbUri,
  );
}
