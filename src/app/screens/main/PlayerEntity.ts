import { Entity, type EntityConfig } from "./Entity";

/**
 * PlayerEntity class handles player-controlled character with keyboard input
 */
export class PlayerEntity extends Entity {
  private keysPressed: Record<string, boolean> = {};
  private interactionLocked = false;
  private keydownHandler: (event: KeyboardEvent) => void;
  private keyupHandler: (event: KeyboardEvent) => void;

  constructor(config: Omit<EntityConfig, "isPlayable">) {
    super({ ...config, isPlayable: true });

    // Store handlers so they can be removed later
    this.keydownHandler = (event: KeyboardEvent) => {
      this.keysPressed[event.key] = true;
    };

    this.keyupHandler = (event: KeyboardEvent) => {
      this.keysPressed[event.key] = false;
    };

    this.setupKeyboardListeners();
  }

  /**
   * Set up keyboard event listeners
   */
  private setupKeyboardListeners(): void {
    window.addEventListener("keydown", this.keydownHandler);
    window.addEventListener("keyup", this.keyupHandler);
  }

  /**
   * Clean up resources and remove event listeners
   */
  public cleanup(): void {
    window.removeEventListener("keydown", this.keydownHandler);
    window.removeEventListener("keyup", this.keyupHandler);
  }

  /**
   * Update player state based on keyboard input
   */
  public override update(): void {
    if (!this.sprite) return;

    const previousDirection = this.currentDirection;
    const wasMoving = this.isMoving;
    this.isMoving = false;

    let dx = 0;
    let dy = 0;

    // Handle movement input
    if (
      this.keysPressed["ArrowUp"] ||
      this.keysPressed["w"] ||
      this.keysPressed["W"]
    ) {
      dy -= 1;
      this.currentDirection = "back";
    }
    if (
      this.keysPressed["ArrowDown"] ||
      this.keysPressed["s"] ||
      this.keysPressed["S"]
    ) {
      dy += 1;
      this.currentDirection = "down";
    }
    if (
      this.keysPressed["ArrowLeft"] ||
      this.keysPressed["a"] ||
      this.keysPressed["A"]
    ) {
      dx -= 1;
      this.currentDirection = "left";
    }
    if (
      this.keysPressed["ArrowRight"] ||
      this.keysPressed["d"] ||
      this.keysPressed["D"]
    ) {
      dx += 1;
      this.currentDirection = "right";
    }

    // Move if there's input
    if (dx !== 0 || dy !== 0) {
      if (this.move(dx, dy)) {
        this.isMoving = true;
      }
    }

    // Change animation if direction changed or movement state changed
    if (
      this.currentDirection !== previousDirection ||
      this.isMoving !== wasMoving
    ) {
      this.changeAnimation(this.currentDirection, this.isMoving);
    }

    // Update depth sorting
    this.updateDepthSorting();

    // Handle interactions
    this.handleInteraction();
  }

  /**
   * Handle interaction with objects in the world
   */
  private handleInteraction(): void {
    const interactionRect = this.getCollisionRect(this.sprite.x, this.sprite.y);
    const target = this.map.getNearestInteraction(interactionRect);
    const interactKey =
      this.keysPressed["e"] ||
      this.keysPressed["E"] ||
      this.keysPressed["Enter"];

    if (target && interactKey && !this.interactionLocked) {
      this.interactionLocked = true;
      target.onInteract();
    }
    if (!interactKey) {
      this.interactionLocked = false;
    }
  }

  /**
   * Get collision rectangle (override for custom collision box)
   */
  protected override getCollisionRect(x: number, y: number) {
    return this.map.getCollisionRectForSprite(this.sprite, x, y);
  }
}
