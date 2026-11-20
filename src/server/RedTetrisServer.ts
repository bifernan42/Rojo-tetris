import { createServer } from "node:http";
import { Server } from "socket.io";
import { PlayerRequestHandler } from "./PlayerRequestHandler";
import { RoomGameManager } from "./RoomGameManager";
import express from "express";
import { join } from "node:path";
import { ScoreStorer } from "./ScoreStorer";

/**
 * # RedTetrisServer
 *
 * This class creates the HTTP and real time servers and connects the handlers.
 * It owns the score storage and the game manager too.
 * We create one instance, then call start to launch the thing !
 */
export class RedTetrisServer {
  /**
   * # app
   *
   * The Express app, allows
   * to register the different handlers for `HTTP methods`
   */
  private readonly app = express();

  /**
   * # scores
   *
   * We instantiate the ScoreStorer class,
   * this object is responsible for :
   * - saving
   * the player's name & score to the database
   * - returning the leaderboard's top 10 scorers
   */
  private readonly scores = new ScoreStorer();

  /**
   * # distPath
   *
   * The path to the transpiled Javascript & asset folder : `dist`
   */
  private readonly distPath = join(process.cwd(), "dist");

  /**
   * # httpServer
   *
   * The nodeJS http server, expects http, returns http
   */
  private readonly httpServer = createServer(this.app);

  /**
   * # io
   *
   * The socket io server, attached to the httpServer
   * It installs the real time routes on the same server as Express.
   * The client can first use HTTP long polling, then upgrade to WebSocket
   * to keep a long lasting bi directional connection.
   * Socket.IO handles this transport, our handlers receive the game events.
   */
  private readonly io = new Server(this.httpServer, {
    cors: {
      origin: "http://localhost:5173",
    },
  });

  /**
   * One game manager handles the timers, updates and score saving for all rooms.
   * The player request handler receives incoming events and uses that manager.
   */
  private readonly gameManager = new RoomGameManager(this.io, (entry) => this.scores.save(entry));
  private readonly playerRequestHandler = new PlayerRequestHandler(this.io, this.gameManager);

  /**
   * # constructor
   *
   * We register the HTTP routes and the incoming player events here.
   * Everything is connected, but the network port is not open yet.
   */
  constructor() {
    this.configureRoutes();
    this.playerRequestHandler.registerEvents();
  }

  /**
   * # configureRoutes
   *
   * This method registers the API, then the static files, then the HTML fallback.
   * The order matters : we look for a file before sending the React page.
   */
  private configureRoutes(): void {
    // this /api route just supplies the leaderboard to the frontend as json
    this.app.get("/api/leaderboard", (req, res) => {
      res.set("Cache-Control", "no-store");
      try {
        res.json(this.scores.topTen());
      } catch (error) {
        console.error("Cannot load leaderboard:", error);
        res.status(503).json({ error: "Leaderboard unavailable" });
      }
    });

    // Just look for a requested file that exists in distPath, (HTML, CSS, JS)
    this.app.use(express.static(this.distPath));

    // Send HTML by default
    this.app.get("/{*splat}", (req, res) => {
      res.sendFile(join(this.distPath, "index.html"));
    });
  }

  /**
   * # start
   *
   * This method opens the network port, HTTP and Socket.IO share this port.
   * @param port -> the port used by the server, 3000 by default
   */
  start(port = 3000): void {
    this.httpServer.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  }

  /**
   * # stop
   *
   * This method stops the timers, then disconnects the players and closes HTTP.
   * We keep the database open until disconnections finish, because they can save scores.
   * After stopping, create a new server instance if you want to start again.
   */
  async stop(): Promise<void> {
    this.gameManager.dispose();
    // Socket.IO also closes the HTTP server it is attached to.
    await this.io.close();
    this.scores.close();
  }
}
