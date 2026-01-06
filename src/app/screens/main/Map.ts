import {
  AnimatedSprite,
  Assets,
  Container,
  Sprite,
  Texture as PixiTexture,
} from "pixi.js";
import { MainScreen } from "./MainScreen";

export class Map {
  public screen!: MainScreen;
  public container = new Container();
  public objectContainer = new Container(); // Separate container for objects that need depth sorting
  private mapSprite!: Sprite; // Keep reference to map sprite

  constructor() {
    // Assets are loaded via the MainScreen bundle, no need to load here
    // Add object container on top of map sprite
    this.container.addChild(this.objectContainer);
  }

  public async show(screen: MainScreen): Promise<void> {
    this.screen = screen;

    console.log("[Map] show() called");

    // Park image should be available from the "main" asset bundle
    const mapAsset = Assets.get("park.png");
    console.log("[Map] mapAsset:", mapAsset);
    console.log(
      "[Map] mapAsset instanceof Texture:",
      mapAsset instanceof PixiTexture,
    );

    const mapTexture = mapAsset;
    if (!mapTexture) {
      console.error("[Map] Park map texture not found!");
      return;
    }

    console.log(
      "[Map] Creating sprite. Texture dimensions:",
      mapTexture.width || "undefined",
      "x",
      mapTexture.height || "undefined",
    );

    const mapSprite = new Sprite(mapTexture);
    console.log(
      "[Map] Sprite created. Sprite dimensions:",
      mapSprite.width,
      "x",
      mapSprite.height,
    );

    mapSprite.x = 0;
    mapSprite.y = 0;
    this.mapSprite = mapSprite;

    console.log("[Map] Adding sprite to container...");
    // Add map sprite to main container (background)
    this.container.addChildAt(mapSprite, 0);
    // Make sure object container is on top
    this.container.addChild(this.objectContainer);

    // Add some decorations for testing depth sorting
    console.log("[Map] Starting addDecorations...");
    try {
      await this.addDecorations();
      console.log("[Map] addDecorations completed successfully");
    } catch (error) {
      console.error("[Map] Error in addDecorations:", error);
    }

    console.log(
      "[Map] Sprite added. Container now has",
      this.container.children.length,
      "children",
    );

    // Add container to screen FIRST (before other elements)
    console.log("[Map] Adding container to mainContainer...");
    // Add to beginning so it's behind other elements
    this.screen.mainContainer.addChildAt(this.container, 0);
    console.log(
      "[Map] Container added. mainContainer now has",
      this.screen.mainContainer.children.length,
      "children",
    );
    console.log("[Map] show() complete");
  }

  private async addDecorations(): Promise<void> {
    console.log("[Map] addDecorations() called");
    try {
      // Add camping trees at different positions
      console.log("[Map] Loading camping tree sheet...");
      const campingTreeSheet = Assets.get("camping_tree.json");
      console.log("[Map] Camping tree sheet:", campingTreeSheet);
      
      if (campingTreeSheet && campingTreeSheet.animations && campingTreeSheet.animations.idle) {
        console.log("[Map] Adding camping trees...");
        const tree1 = new AnimatedSprite(campingTreeSheet.animations.idle);
        tree1.x = 150;
        tree1.y = 80;
        tree1.animationSpeed = 0.1;
        tree1.play();
        this.objectContainer.addChild(tree1);

        const tree2 = new AnimatedSprite(campingTreeSheet.animations.idle);
        tree2.x = 300;
        tree2.y = 120;
        tree2.animationSpeed = 0.1;
        tree2.play();
        this.objectContainer.addChild(tree2);

        const tree3 = new AnimatedSprite(campingTreeSheet.animations.idle);
        tree3.x = 200;
        tree3.y = 200;
        tree3.animationSpeed = 0.1;
        tree3.play();
        this.objectContainer.addChild(tree3);
        console.log("[Map] Camping trees added successfully");
      } else {
        console.warn("[Map] Camping tree sheet not found or missing idle animation");
      }

      // Add objects from Tiled map
      console.log("[Map] Starting addTiledObjects...");
      await this.addTiledObjects();
      console.log("[Map] addTiledObjects completed");
      
      // Sort all objects by depth after adding everything
      this.updateDepthSort();
      console.log("[Map] Depth sorting applied");
    } catch (error) {
      console.warn("[Map] Some decorations failed to load:", error);
      // Don't re-throw, continue execution
    }
  }

  private async addTiledObjects(): Promise<void> {
    try {
      // Load park map data
      console.log("[Map] Loading park map data...");
      const parkMapData = Assets.get("park.json");
      console.log("[Map] Park map data:", parkMapData);
      
      if (!parkMapData) {
        console.warn("[Map] Park map data not found");
        return;
      }

      console.log("[Map] Processing layers...");
      // Process object layers
      for (const layer of parkMapData.layers) {
        console.log(`[Map] Layer: ${layer.name}, type: ${layer.type}, visible: ${layer.visible}`);
        if (layer.type === "objectgroup") {
          await this.processObjectLayer(layer);
        }
      }
    } catch (error) {
      console.warn("[Map] Failed to process Tiled objects:", error);
    }
  }

  private async processObjectLayer(layer: any): Promise<void> {
    console.log(`[Map] Processing object layer: ${layer.name}`);
    console.log(`[Map] Layer visible: ${layer.visible}, objects: ${layer.objects?.length || 0}`);
    
    if (!layer.objects) {
      console.log("[Map] No objects in layer");
      return;
    }

    // Process all objects regardless of layer visibility (visibility might be for editor only)
    for (const object of layer.objects) {
      console.log(`[Map] Processing object: ${object.name} at (${object.x}, ${object.y})`);
      await this.createObjectSprite(object);
    }
  }

  private async createObjectSprite(object: any): Promise<void> {
    try {
      // Generic object creation based on object name
      // Check if there's a sprite sheet for this object
      const spriteSheet = Assets.get(`${object.name}.json`);
      
      if (spriteSheet && spriteSheet.animations) {
        // Create animated sprite if animation data exists
        await this.createAnimatedObject(object, spriteSheet);
      } else {
        // Try to create static sprite if no animation
        const texture = Assets.get(`${object.name}.png`) || Assets.get(`${object.name}-0.png`);
        if (texture) {
          this.createStaticObject(object, texture);
        } else {
          console.warn(`[Map] No sprite found for object: ${object.name}`);
        }
      }
    } catch (error) {
      console.warn(`[Map] Failed to create object ${object.name}:`, error);
    }
  }

  private async createAnimatedObject(object: any, spriteSheet: any): Promise<void> {
    console.log(`[Map] Creating animated object: ${object.name}`);
    
    // Get the first available animation (or use object name if exists)
    const animationKey = spriteSheet.animations[object.name] 
      ? object.name 
      : Object.keys(spriteSheet.animations)[0];
      
    if (!animationKey || !spriteSheet.animations[animationKey]) {
      console.warn(`[Map] No animation found for ${object.name}`);
      return;
    }

    console.log(`[Map] Using animation: ${animationKey}`);
    const animatedSprite = new AnimatedSprite(spriteSheet.animations[animationKey]);
    
    // Set position from Tiled object
    // In Tiled: (x,y) represents the BOTTOM-LEFT corner of the object
    animatedSprite.x = object.x;
    animatedSprite.y = object.y;
    
    // Set default animation properties
    animatedSprite.animationSpeed = 0.08;
    animatedSprite.loop = false;
    animatedSprite.gotoAndStop(0); // Start with first frame
    
    // Add interactivity based on object type
    this.setupObjectInteraction(animatedSprite, object);
    
    this.objectContainer.addChild(animatedSprite);
    console.log(`[Map] Added animated object ${object.name} at (${animatedSprite.x}, ${animatedSprite.y})`);
  }

  private createStaticObject(object: any, texture: any): void {
    console.log(`[Map] Creating static object: ${object.name}`);
    
    const sprite = new Sprite(texture);
    
    // Set position from Tiled object
    sprite.x = object.x;
    sprite.y = object.y;
    
    // Add interactivity based on object type
    this.setupObjectInteraction(sprite, object);
    
    this.objectContainer.addChild(sprite);
    console.log(`[Map] Added static object ${object.name} at (${sprite.x}, ${sprite.y})`);
  }

  private setupObjectInteraction(sprite: any, object: any): void {
    // Setup interaction based on object name or type
    switch (object.name) {
      case 'railing_gate':
        sprite.eventMode = 'static';
        sprite.cursor = 'pointer';
        
        let isOpen = false;
        sprite.onpointertap = () => {
          if (sprite instanceof AnimatedSprite) {
            if (isOpen) {
              sprite.gotoAndPlay(0);
              isOpen = false;
              console.log(`[Map] Closing ${object.name}`);
            } else {
              sprite.play();
              isOpen = true;
              console.log(`[Map] Opening ${object.name}`);
            }
          }
        };
        break;
        
      // Add more object types here as needed
      // case 'door':
      // case 'switch':
      // case 'chest':
      //   // Setup specific interactions
      //   break;
        
      default:
        // No interaction for unknown objects
        break;
    }
  }

  public async addPlayer(player: AnimatedSprite) {
    console.log("[Map] Adding player to object container at position:", player.x, player.y);
    console.log("[Map] Player dimensions:", player.width, player.height);
    console.log("[Map] Object container children before adding player:", this.objectContainer.children.length);
    
    this.objectContainer.addChild(player);
    
    console.log("[Map] Object container children after adding player:", this.objectContainer.children.length);
    console.log("[Map] Player added successfully, updating depth sort...");
    
    // Update depth sort whenever player is added
    this.updateDepthSort();
    
    console.log("[Map] All object container children positions:");
    this.objectContainer.children.forEach((child, index) => {
      console.log(`[Map] Child ${index}: x=${child.x}, y=${child.y}, width=${child.width}, height=${child.height}`);
    });
  }

  public updateDepthSort(): void {
    console.log("[Map] Running depth sort on object container...");
    console.log("[Map] Object children before sort:", this.objectContainer.children.length);
    
    // Sort children by Y position + height for proper depth ordering
    // Objects with higher bottom position (y + height) appear in front
    this.objectContainer.children.sort((a, b) => {
      const aBottom = a.y + (a.height || 0);
      const bBottom = b.y + (b.height || 0);
      return aBottom - bBottom;
    });
    
    console.log("[Map] Object children after sort:", this.objectContainer.children.length);
    console.log("[Map] Final sort order:");
    this.objectContainer.children.forEach((child, index) => {
      const bottom = child.y + (child.height || 0);
      console.log(`[Map] ${index}: bottom=${bottom}, x=${child.x}, y=${child.y}`);
    });
  }
}
