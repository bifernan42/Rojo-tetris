import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RoomPanel from "../room/RoomPanel";
import GameBoard from "../game/GameBoard";
import type { RoomState } from "../../common/protocol";
import { createGame } from "../../engine/game";
import { createTetromino } from "../../engine/tetrominoes";
import { INDESTRUCTIBLE } from "../../engine/consts";
import OpponentsPanel from "../game/OpponentsPanel";
import RoomForms from "../room/RoomForms";
import MainMenu from "../menu/MainMenu";
import { TouchControls } from "../mobile/TouchControls";

const room: RoomState = {
  name: "room",
  hostId: "host",
  status: "WAITING",
  winnerId: null,
  winnerName: null,
  players: [{ id: "host", name: "Host" }],
  hardMode: false,
};
const handlers = {
  onStart: () => {},
  onRestart: () => {},
  onToggleHardMode: () => {},
  onMenu: () => {},
};
function panel(state: RoomState, playerId = "host") {
  return renderToStaticMarkup(
    createElement(RoomPanel, {
      ...handlers,
      room: state,
      playerId,
      participated: true,
      disabled: false,
    }),
  );
}

describe("game presentation", () => {
  it("lets a lone host start the game", () => {
    const html = panel(room);
    expect(html).toContain("Ready to start");
    expect(html).toMatch(
      /<button class="gc-button gc-button--primary">Start game/,
    );
  });

  it("lets the host replay a finished game without waiting for guests", () => {
    const finished: RoomState = {
      ...room,
      status: "FINISHED",
      winnerId: "host",
      winnerName: "Host",
      players: [...room.players, { id: "guest", name: "Guest" }],
    };
    expect(panel(finished)).toMatch(
      /<button class="gc-button gc-button--primary">Replay/,
    );
    const guest = panel(finished, "guest");
    expect(guest).toContain("Waiting for host");
    expect(guest).toMatch(/<button[^>]*disabled=""[^>]*>Replay/);
  });

  it("shows the hard mode state to everyone, but lets only the host toggle it", () => {
    const withGuest: RoomState = {
      ...room,
      players: [...room.players, { id: "guest", name: "Guest" }],
    };
    const hardModeButton = (html: string) =>
      html.match(
        /<button[^>]*aria-pressed[^>]*>Hard mode[^<]*(?:<!-- -->)?(ON|OFF)<\/button>/,
      );

    const off = hardModeButton(panel(withGuest));
    expect(off?.[1]).toBe("OFF");
    expect(off?.[0]).toContain('aria-pressed="false"');
    expect(off?.[0]).not.toContain("disabled");

    const on = hardModeButton(panel({ ...withGuest, hardMode: true }));
    expect(on?.[1]).toBe("ON");
    expect(on?.[0]).toContain('aria-pressed="true"');

    const guest = hardModeButton(
      panel({ ...withGuest, hardMode: true }, "guest"),
    );
    expect(guest?.[1]).toBe("ON");
    expect(guest?.[0]).toContain('disabled=""');
  });

  it("shows the hard mode toggle in every phase, but locks it while playing", () => {
    const unlocked = /<button(?![^>]*disabled)[^>]*>Hard mode/;
    expect(panel(room)).toMatch(unlocked);
    expect(panel({ ...room, status: "FINISHED" })).toMatch(unlocked);
    expect(panel({ ...room, status: "PLAYING" })).toMatch(
      /<button[^>]*disabled=""[^>]*>Hard mode/,
    );
  });

  it("shows penalties and preserves the final board without an invalid active piece", () => {
    const game = createGame(createTetromino("O"));
    game.board[19] = Array(10).fill(INDESTRUCTIBLE);
    const html = renderToStaticMarkup(
      createElement(GameBoard, { game: { ...game, gameOver: true } }),
    );
    expect(html.match(/cell--1/g)).toHaveLength(10);
    expect(html).not.toContain("cell-2");
    expect(html.match(/class="cell /g)).toHaveLength(200);
  });
});

describe("opponents", () => {
  it("shows current opponents but hides yourself and players who left", () => {
    const html = renderToStaticMarkup(
      createElement(OpponentsPanel, {
        room: {
          ...room,
          players: [...room.players, { id: "guest", name: "Guest" }],
        },
        playerId: "host",
        spectra: [
          { playerId: "host", name: "Host", heights: [4] },
          { playerId: "guest", name: "Guest", heights: [0, 10, 20] },
          { playerId: "gone", name: "Gone", heights: [3] },
        ],
      }),
    );
    expect(html).toContain("Guest");
    expect(html).not.toContain("Host");
    expect(html).not.toContain("Gone");
    expect(html).toContain("height:0%");
    expect(html).toContain("height:50%");
    expect(html).toContain("height:100%");
  });
});

describe("room forms", () => {
  const props = {
    urlRoom: undefined,
    urlPlayer: undefined,
    registeredName: "",
    name: "Alice",
    roomName: "friends",
    disabled: false,
    onNameChange: () => {},
    onRoomNameChange: () => {},
    onRegisterSubmit: () => {},
    onRoomSubmit: () => {},
  };

  it("asks for a name before offering rooms", () => {
    const html = renderToStaticMarkup(createElement(RoomForms, props));
    expect(html).toContain('id="player-name"');
    expect(html).toContain('value="Alice"');
    expect(html).toContain("Continue");
    expect(html).not.toContain("Create room");
  });

  it("offers create and join after registration", () => {
    const html = renderToStaticMarkup(
      createElement(RoomForms, {
        ...props,
        registeredName: "Alice",
      }),
    );
    expect(html).toContain('value="friends"');
    expect(html).toContain("Create room");
    expect(html).toContain("Join room");
    expect(html).not.toContain('id="player-name"');
  });

  it("shows a waiting message when joining from a shared link", () => {
    const html = renderToStaticMarkup(
      createElement(RoomForms, {
        ...props,
        urlRoom: "friends",
        urlPlayer: "Alice",
      }),
    );
    expect(html).toContain('role="status">Joining room...');
    expect(html).not.toContain("<form");
  });

  it("disables the room input and both buttons while connecting", () => {
    const html = renderToStaticMarkup(
      createElement(RoomForms, {
        ...props,
        registeredName: "Alice",
        disabled: true,
      }),
    );
    expect(html.match(/disabled=""/g)).toHaveLength(3);
  });
});

describe("menu and touch controls", () => {
  it("offers multiplayer and the leaderboard on the menu", () => {
    const html = renderToStaticMarkup(
      createElement(MainMenu, {
        onPlay: () => {},
        onLeaderboard: () => {},
      }),
    );
    expect(html).toContain("Play");
    expect(html).toContain("1+ players");
    expect(html).toContain("Leaderboard");
    expect(html).toContain("Top 10 scores");
    expect(html.match(/<button /g)).toHaveLength(2);
  });

  it.each([true, false])(
    "enables touch controls only when canPlay is %s",
    (canPlay) => {
      const html = renderToStaticMarkup(
        createElement(TouchControls, {
          canPlay,
          onAction: () => {},
        }),
      );
      expect(html.match(/<button /g)).toHaveLength(5);
      expect(html.match(/disabled=""/g) ?? []).toHaveLength(canPlay ? 0 : 5);
    },
  );
});
