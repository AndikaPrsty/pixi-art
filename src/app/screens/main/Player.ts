import { PlayerEntity } from "./PlayerEntity";
import type { Map } from "./Map";

/**
 * Player class - wrapper for backward compatibility
 * Uses PlayerEntity internally
 */
export class Player {
  private playerEntity: PlayerEntity;

  constructor() {
    this.playerEntity = new PlayerEntity({
      x: 520,
      y: 600,
      speed: 0.9,
      spriteSheet: "player.json",
    });
  }

  public async add(map: Map): Promise<void> {
    await this.playerEntity.initialize(map, 520, 600);
  }

  public update(): void {
    this.playerEntity.update();
  }
}
