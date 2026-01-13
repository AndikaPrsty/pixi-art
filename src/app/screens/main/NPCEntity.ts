import { Rectangle } from "pixi.js";
import { Entity, type EntityConfig } from "./Entity";

/**
 * NPCEntity class handles non-player character with AI-controlled movement
 */
export class NPCEntity extends Entity {
  private direction = { x: 0, y: 0 };
  private directionTimer = 0;
  private interactionLocked = false;

  constructor(config: Omit<EntityConfig, "isPlayable">) {
    super({ ...config, isPlayable: false });
  }

  /**
   * Update NPC state with AI behavior
   */
  public override update(): void {
    if (!this.sprite) return;

    // Change direction when timer runs out
    if (this.directionTimer <= 0) {
      this.setRandomDirection();
    }
    this.directionTimer -= 1;

    // Try to move in current direction
    const nextX = this.sprite.x + this.direction.x * this.speed;
    const nextY = this.sprite.y + this.direction.y * this.speed;
    const npcRect = this.getCollisionRect(nextX, nextY);

    const wasMoving = this.isMoving;
    if (!this.map.checkCollision(npcRect)) {
      this.sprite.x = nextX;
      this.sprite.y = nextY;
      this.isMoving = this.direction.x !== 0 || this.direction.y !== 0;

      // Update animation if movement state changed
      if (this.isMoving !== wasMoving) {
        this.changeAnimation(this.currentDirection, this.isMoving);
      }

      // Update depth sorting when moving vertically
      if (this.direction.y !== 0) {
        this.updateDepthSorting();
      }
    } else {
      // Hit a wall, choose new direction immediately
      this.directionTimer = 0;
      this.isMoving = false;
    }

    // Handle NPC interactions with objects
    this.handleInteraction(npcRect);
  }

  /**
   * Set a random direction for the NPC to move
   */
  private setRandomDirection(): void {
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 0, y: 0 }, // Stay still
    ];

    this.direction = directions[Math.floor(Math.random() * directions.length)];
    this.directionTimer = 90 + Math.floor(Math.random() * 60);

    // Update direction and animation
    if (this.direction.x !== 0 || this.direction.y !== 0) {
      this.updateDirection(this.direction.x, this.direction.y);
    }

    const moving = this.direction.x !== 0 || this.direction.y !== 0;
    this.changeAnimation(this.currentDirection, moving);
  }

  /**
   * Handle NPC interactions with interactive objects
   */
  private handleInteraction(npcRect: Rectangle): void {
    const target = this.map.getNearestInteraction(npcRect);
    if (target && !this.interactionLocked) {
      this.interactionLocked = true;
      target.onInteract();
      // Wait a bit before allowing another interaction
      this.directionTimer = Math.max(this.directionTimer, 45);
    }
    if (!target) {
      this.interactionLocked = false;
    }
  }
}
