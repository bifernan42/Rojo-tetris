import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ScoreEntry } from '../common/protocol';

export class ScoreStorer {
  private readonly db: DatabaseSync;

  /**
   * # constructor
   * 
   * The `ScoreStorer` constructor, it creates
   * the leaderboard database
   * @param path -> the database file path
   */
  constructor(path = 'data/leaderboard.sqlite') {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS scores (
      name TEXT PRIMARY KEY,
      score INTEGER NOT NULL CHECK (score >= 0)
    )`);
  }

  /**
   * # save
   * 
   * This function receives a 'ScoreEntry' which is a player's name and score
   * performed in one game, it stores this object in the scores table in the database
   * 
   * @param entry -> a `ScoreEntry` type represeting one player's name & score during a game
   */
  save(entry: ScoreEntry): void {
    this.db.prepare(`INSERT INTO scores (name, score) VALUES (?, ?)
      ON CONFLICT(name) DO UPDATE SET score = excluded.score
      WHERE excluded.score > scores.score`).run(entry.name, entry.score);
  }

  /**
   * # topTen
   * 
   * This function returns the top 10 players ever, ordered by score (DESC)
   * 
   * @returns `ScoreEntry[]` array, a 10-length array containing `Score Entry`
   */
  topTen(): ScoreEntry[] {
    return this.db.prepare('SELECT name, score FROM scores ORDER BY score DESC, name ASC LIMIT 10')
      .all().map(row => ({ name: String(row.name), score: Number(row.score) }));
  }

  /**
   * # close
   *
   * This method closes the database when the server is no longer using it.
   * Call it after the players have disconnected and their scores are saved.
   */
  close(): void {
    this.db.close();
  }
}
