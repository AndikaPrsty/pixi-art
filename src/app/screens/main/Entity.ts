import { AnimatedSprite, Assets, Rectangle } from "pixi.js";
import type { Map } from "./Map";

export type Direction = "down" | "back" | "left" | "right";

export interface EntityConfig {
  x: number;
  y: number;
  speed: number;
  spriteSheet: string;
  isPlayable?: boolean;
}

/**
 * Base Entity class for all characters (players, NPCs, etc.)
 * This class handles common behavior like movement, animation, and collision
 */
export abstract class Entity {
  public sprite!: AnimatedSprite;
  public map!: Map;
  protected speed: number;
  protected currentDirection: Direction = "down";
  protected isMoving = false;
  protected lastSortY = -1;
  protected spriteSheet: string;
  public isPlayable: boolean;

  constructor(config: EntityConfig) {
    this.speed = config.speed;
    this.spriteSheet = config.spriteSheet;
    this.isPlayable = config.isPlayable ?? false;
  }

  /**
   * Initialize the entity and add it to the map
   */
  public async initialize(map: Map, x: number, y: number): Promise<void> {
    this.map = map;
    const sheet = Assets.get(this.spriteSheet);
    this.sprite = new AnimatedSprite(sheet.animations.idle);
    this.sprite.x = x;
    this.sprite.y = y;
    this.sprite.animationSpeed = 0.2;
    this.sprite.play();

    await map.addEntity(this.sprite);
  }

  /**
   * Update entity state - must be implemented by subclasses
   */
  public abstract update(): void;

  /**
   * Move the entity by dx, dy if there's no collision
   */
  protected move(dx: number, dy: number): boolean {
    if (!this.sprite) return false;

    const length = Math.hypot(dx, dy);
    const scale = length === 0 ? 0 : this.speed / length;
    const newX = this.sprite.x + dx * scale;
    const newY = this.sprite.y + dy * scale;

    if (!this.checkCollision(newX, newY)) {
      this.sprite.x = newX;
      this.sprite.y = newY;
      return true;
    }
    return false;
  }

  /**
   * Update the direction based on movement vector
   */
  protected updateDirection(dx: number, dy: number): void {
    if (Math.abs(dx) > Math.abs(dy)) {
      this.currentDirection = dx > 0 ? "right" : "left";
    } else if (dy !== 0) {
      this.currentDirection = dy > 0 ? "down" : "back";
    }
  }

  /**
   * Change animation based on current direction and movement state
   */
  protected changeAnimation(direction: Direction, moving: boolean): void {
    if (!this.sprite) return;

    const sheet = Assets.get(this.spriteSheet);

    let animationKey: string;
    if (moving) {
      // Use walk animations when moving
      animationKey = direction === "down" ? "walk" : `walk_${direction}`;
    } else {
      // Use idle animations when stationary
      animationKey = direction === "down" ? "idle" : `idle_${direction}`;
    }

    if (
      sheet.animations[animationKey] &&
      this.sprite.textures !== sheet.animations[animationKey]
    ) {
      this.sprite.textures = sheet.animations[animationKey];
      this.sprite.gotoAndPlay(0);
    }
  }

  /**
   * Check collision with map colliders
   */
  protected checkCollision(x: number, y: number): boolean {
    if (!this.map) return false;

    const entityRect = this.getCollisionRect(x, y);

    // Check map boundaries
    if (
      entityRect.x < 0 ||
      entityRect.y < 0 ||
      entityRect.x + entityRect.width > this.map.mapWidth ||
      entityRect.y + entityRect.height > this.map.mapHeight
    ) {
      return true; // Collision with boundary
    }

    return this.map.checkCollision(entityRect);
  }

  /**
   * Get collision rectangle for the entity at given position
   */
  protected getCollisionRect(x: number, y: number): Rectangle {
    return this.map.getCollisionRectForSprite(this.sprite, x, y);
  }

  /**
   * Update depth sorting when entity moves significantly on Y axis
   */
  protected updateDepthSorting(): void {
    if (this.isMoving && Math.abs(this.sprite.y - this.lastSortY) > 5) {
      this.map.updateDepthSort();
      this.lastSortY = this.sprite.y;
    }
  }

  /**
   * Get the current position of the entity
   */
  public getPosition(): { x: number; y: number } {
    return {
      x: this.sprite?.x ?? 0,
      y: this.sprite?.y ?? 0,
    };
  }

  /**
   * Get current direction
   */
  public getDirection(): Direction {
    return this.currentDirection;
  }
}
