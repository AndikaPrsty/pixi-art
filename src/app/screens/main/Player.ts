import { AnimatedSprite, Assets } from "pixi.js";
import { Map } from "./Map";
import { Rectangle } from "pixi.js";

export class Player {
  public map!: Map;
  private player!: AnimatedSprite;
  private speed = 0.7;
  private keysPressed: Record<string, boolean> = {};
  private currentDirection: "down" | "back" | "left" | "right" = "down";
  private isMoving = false;
  private lastSortY = -1;

  constructor() {
    this.setupKeyboardListeners();
  }

  private setupKeyboardListeners(): void {
    window.addEventListener("keydown", (event) => {
      this.keysPressed[event.key] = true;
    });

    window.addEventListener("keyup", (event) => {
      this.keysPressed[event.key] = false;
    });
  }

  public async add(map: Map): Promise<void> {
    this.map = map;
    const sheet = Assets.get("player.json");
    this.player = new AnimatedSprite(sheet.animations.idle);
    // Start player at a position that makes sense on the map
    this.player.x = 520; // Center horizontally (1040/2)
    this.player.y = 600; // Position in lower area so player appears in front when moving up
    this.player.animationSpeed = 0.2;
    this.player.play();

    // Use the map's addPlayer method for proper depth sorting
    await map.addPlayer(this.player);
  }

  public update(): void {
    if (!this.player) return;

    const previousDirection = this.currentDirection;
    const wasMoving = this.isMoving;
    this.isMoving = false;

    // Check arrow keys and WASD
    if (
      this.keysPressed["ArrowUp"] ||
      this.keysPressed["w"] ||
      this.keysPressed["W"]
    ) {
      const newY = this.player.y - this.speed;
      if (!this.checkCollision(this.player.x, newY)) {
        this.player.y = newY;
        this.isMoving = true;
      }
			this.currentDirection = "back";
    }
    if (
      this.keysPressed["ArrowDown"] ||
      this.keysPressed["s"] ||
      this.keysPressed["S"]
    ) {
      const newY = this.player.y + this.speed;
      if (!this.checkCollision(this.player.x, newY)) {
        this.player.y = newY;
        this.isMoving = true;
      }
			this.currentDirection = "down";
    }
    if (
      this.keysPressed["ArrowLeft"] ||
      this.keysPressed["a"] ||
      this.keysPressed["A"]
    ) {
      const newX = this.player.x - this.speed;
      if (!this.checkCollision(newX, this.player.y)) {
        this.player.x = newX;
        this.isMoving = true;
      }
			this.currentDirection = "left";
    }
    if (
      this.keysPressed["ArrowRight"] ||
      this.keysPressed["d"] ||
      this.keysPressed["D"]
    ) {
      const newX = this.player.x + this.speed;
      if (!this.checkCollision(newX, this.player.y)) {
        this.player.x = newX;
        this.isMoving = true;
      }
			this.currentDirection = "right";
    }

    // Change animation if direction changed or movement state changed
    if (
      this.currentDirection !== previousDirection ||
      this.isMoving !== wasMoving
    ) {
      this.changeAnimation(this.currentDirection);
    }

    // Update depth sorting only when Y position changes significantly
    if (this.isMoving && Math.abs(this.player.y - this.lastSortY) > 5) {
      this.map.updateDepthSort();
      this.lastSortY = this.player.y;
    }
  }

  private changeAnimation(direction: "down" | "back" | "left" | "right"): void {
    const sheet = Assets.get("player.json");

    let animationKey: string;
    if (this.isMoving) {
      // Use walk animations when moving
      animationKey = direction === "down" ? "walk" : `walk_${direction}`;
    } else {
      // Use idle animations when stationary
      animationKey = direction === "down" ? "idle" : `idle_${direction}`;
    }

    if (
      sheet.animations[animationKey] &&
      this.player.textures !== sheet.animations[animationKey]
    ) {
      this.player.textures = sheet.animations[animationKey];
      this.player.gotoAndPlay(0);
    }
  }

  // Check collision with map colliders
  private checkCollision(x: number, y: number): boolean {
    if (!this.map) return false;

    // Create a collision rectangle for the player at the new position
    // Adjust the collision box to be smaller than the sprite for better gameplay
    const playerRect = new Rectangle(
      x + this.player.width * 0.25, // Offset by 25% to center the collision box
      y + this.player.height * 0.7, // Use lower portion of sprite for collision
      this.player.width * 0.5,      // 50% width for tighter collision
      this.player.height * 0.3      // 30% height for feet area
    );

    // Check map boundaries (map is 65 tiles * 16px = 1040px wide, 55 tiles * 16px = 880px tall)
    if (playerRect.x < 0 || playerRect.y < 0 ||
        playerRect.x + playerRect.width > 1040 ||
        playerRect.y + playerRect.height > 880) {
      return true; // Collision with boundary
    }

    return this.map.checkCollision(playerRect);
  }
}
