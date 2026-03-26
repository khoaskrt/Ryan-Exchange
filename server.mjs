import { createServer } from "node:http";
import { parse as parseCookie } from "cookie";
import { jwtVerify } from "jose";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);

const SESSION_COOKIE_NAME = "kv_session";
const authSecret = process.env.AUTH_SECRET;

if (!authSecret) {
  throw new Error("AUTH_SECRET is required to run the socket server.");
}

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();
const encoder = new TextEncoder();

function getSessionTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const cookies = parseCookie(cookieHeader);
  return cookies[SESSION_COOKIE_NAME] ?? null;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handler(req, res);
  });

  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: true,
      credentials: true,
    },
  });

  globalThis.__walletSocketIo = io;

  io.use(async (socket, nextMiddleware) => {
    try {
      const token = getSessionTokenFromCookie(socket.handshake.headers.cookie);
      if (!token) {
        return nextMiddleware(new Error("Unauthorized"));
      }

      const { payload } = await jwtVerify(token, encoder.encode(authSecret));
      const userId = typeof payload.sub === "string" ? payload.sub : null;

      if (!userId) {
        return nextMiddleware(new Error("Unauthorized"));
      }

      socket.data.userId = userId;
      return nextMiddleware();
    } catch {
      return nextMiddleware(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const room = `user:${socket.data.userId}`;
    socket.join(room);

    socket.emit("wallet:connected", {
      connectedAt: new Date().toISOString(),
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log("> Wallet realtime socket is enabled at path /socket.io");
    });
});
