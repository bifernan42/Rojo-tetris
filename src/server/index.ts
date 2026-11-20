import { RedTetrisServer } from "./RedTetrisServer";

/**
 * Create the server and launch the thing !
 * The class takes care of connecting the routes and the player handlers.
 */
const server = new RedTetrisServer();
server.start(3000);
