import express, { type ErrorRequestHandler, type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
const isClerkEnabled = process.env.AUTH_MODE === "clerk";

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

if (isClerkEnabled) {
  app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
}

app.use(
  cors({
    credentials: true,
    origin: getCorsOrigins(),
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (isClerkEnabled) {
  app.use(
    clerkMiddleware((req) => ({
      publishableKey: publishableKeyFromHost(
        getClerkProxyHost(req) ?? "",
        process.env.CLERK_PUBLISHABLE_KEY,
      ),
    })),
  );
}

app.use("/api", router);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  req.log.error({ err }, "Unhandled request error");
  res.status(500).json({ error: "Internal server error" });
};

app.use(errorHandler);

export default app;

function getCorsOrigins(): string[] | true {
  const origins = process.env.CORS_ORIGIN?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins?.length ? origins : true;
}
