import type { PlayerIdentity } from '../common/protocol';

/**
 * # Player
 * 
 * This class represents a Player
 * since the Player model is very
 * simple (an id provided by socket and a name)
 * it implements PlayerIdentity, which is the
 * data type used to communicate Player PlayerIdentity
 * throuhout our app.
 */
export class Player implements PlayerIdentity {
  constructor(
    public readonly id: string,
    public readonly name: string
  ) { }
}
