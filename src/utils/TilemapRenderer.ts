import { Assets, Container, Sprite, Texture as PixiTexture } from "pixi.js";

interface TilemapData {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TileLayer[];
  tilesets: Tileset[];
}

interface TileLayer {
  id: number;
  name: string;
  type: string;
  data?: number[] | string; // Can be array or base64 string
  encoding?: string; // "base64" or undefined
  compression?: string;
  objects?: TileObject[];
  width: number;
  height: number;
  visible: boolean;
  opacity: number;
}

interface TileObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  rotation: number;
}

interface Tileset {
  firstgid: number;
  name: string;
  image: string;
  imagewidth: number;
  imageheight: number;
  tilewidth: number;
  tileheight: number;
  tilecount: number;
  columns: number;
  margin?: number;
  spacing?: number;
}

export class TilemapRenderer {
  private tilemapData: TilemapData;
  private tilesetTextures: Map<string, PixiTexture> = new Map();
  private tileTextures: Map<number, PixiTexture> = new Map();
  
  constructor(tilemapData: TilemapData) {
    this.tilemapData = tilemapData;
  }

  public async loadTilesets(): Promise<boolean> {
    console.log("[TilemapRenderer] Loading tilesets...");
    
    let loadedCount = 0;
    
    for (const tileset of this.tilemapData.tilesets) {
      try {
        // Try to load tileset texture
        const imagePath = tileset.image.split('/').pop(); // Get filename only
        let texture;
        
        // Try different possible asset names
        const possibleNames = [
          imagePath,
          imagePath?.replace('.png', ''),
          tileset.name,
          tileset.name.toLowerCase()
        ];
        
        for (const name of possibleNames) {
          if (name) {
            texture = Assets.get(name);
            if (texture) break;
          }
        }
        
        if (texture) {
          console.log(`[TilemapRenderer] Loaded tileset: ${tileset.name}`);
          this.tilesetTextures.set(tileset.name, texture);
          
          // Pre-generate tile textures for this tileset
          this.generateTileTextures(tileset, texture);
          loadedCount++;
        } else {
          console.warn(`[TilemapRenderer] Could not load tileset: ${tileset.name}, image: ${imagePath}`);
        }
      } catch (error) {
        console.warn(`[TilemapRenderer] Failed to load tileset ${tileset.name}:`, error);
      }
    }
    
    console.log(`[TilemapRenderer] Loaded ${loadedCount}/${this.tilemapData.tilesets.length} tilesets`);
    console.log(`[TilemapRenderer] Generated ${this.tileTextures.size} tile textures`);
    
    return loadedCount > 0;
  }

  private generateTileTextures(tileset: Tileset, texture: PixiTexture): void {
    const { tilewidth, tileheight, columns, firstgid, tilecount } = tileset;
    
    for (let i = 0; i < tilecount; i++) {
      const gid = firstgid + i;
      const col = i % columns;
      const row = Math.floor(i / columns);
      
      const x = col * tilewidth;
      const y = row * tileheight;
      
      try {
        const tileTexture = new PixiTexture({
          source: texture.source,
          frame: { x, y, width: tilewidth, height: tileheight }
        });
        
        this.tileTextures.set(gid, tileTexture);
      } catch (error) {
        // Skip invalid tiles
      }
    }
  }

  public renderLayers(container: Container): Container[] {
    const layerContainers: Container[] = [];
    
    console.log(`[TilemapRenderer] Rendering ${this.tilemapData.layers.length} layers`);
    
    for (const layer of this.tilemapData.layers) {
      if (!layer.visible) continue;
      
      const layerContainer = new Container();
      layerContainer.name = layer.name;
      
      if (layer.type === "tilelayer" && layer.data) {
        this.renderTileLayer(layer, layerContainer);
      } else if (layer.type === "objectgroup" && layer.objects) {
        // Object layers are handled separately in Map.ts
        continue;
      }
      
      if (layerContainer.children.length > 0) {
        container.addChild(layerContainer);
        layerContainers.push(layerContainer);
        console.log(`[TilemapRenderer] Rendered layer: ${layer.name} with ${layerContainer.children.length} tiles`);
      }
    }
    
    return layerContainers;
  }

  private renderTileLayer(layer: TileLayer, container: Container): void {
    if (!layer.data) return;
    
    const { tilewidth, tileheight } = this.tilemapData;
    let tileData: number[];
    
    // Handle different data formats
    if (Array.isArray(layer.data)) {
      // Use array data directly (processed format)
      tileData = layer.data;
    } else if (typeof layer.data === 'string' && layer.encoding === 'base64') {
      // Decode base64 to tile IDs (raw format)
      tileData = this.decodeBase64TileData(layer.data);
    } else {
      console.warn(`[TilemapRenderer] Unknown tile data format for layer ${layer.name}`);
      return;
    }
    
    console.log(`[TilemapRenderer] Rendering ${layer.name} with ${tileData.length} tiles, tilesize: ${tilewidth}x${tileheight}`);
    
    let tilesRendered = 0;
    for (let y = 0; y < layer.height; y++) {
      for (let x = 0; x < layer.width; x++) {
        const index = y * layer.width + x;
        const gid = tileData[index];
        
        if (gid === 0) continue; // Empty tile
        
        const tileTexture = this.tileTextures.get(gid);
        if (!tileTexture) {
          // Log missing textures but don't spam
          if (tilesRendered === 0) {
            console.log(`[TilemapRenderer] Missing texture for gid ${gid} in layer ${layer.name}`);
          }
          continue;
        }
        
        const sprite = new Sprite(tileTexture);
        sprite.x = x * tilewidth;
        sprite.y = y * tileheight;
        
        container.addChild(sprite);
        tilesRendered++;
      }
    }
    
    console.log(`[TilemapRenderer] Layer ${layer.name}: rendered ${tilesRendered} tiles out of ${tileData.length} total`);
  }

  private decodeBase64TileData(base64Data: string): number[] {
    try {
      // Decode base64 to binary data
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Convert bytes to 32-bit integers (little-endian)
      const tileCount = bytes.length / 4;
      const tileData: number[] = new Array(tileCount);
      
      for (let i = 0; i < tileCount; i++) {
        const offset = i * 4;
        tileData[i] = bytes[offset] | 
                     (bytes[offset + 1] << 8) | 
                     (bytes[offset + 2] << 16) | 
                     (bytes[offset + 3] << 24);
      }
      
      console.log(`[TilemapRenderer] Decoded ${tileData.length} tiles from base64`);
      return tileData;
    } catch (error) {
      console.error("[TilemapRenderer] Failed to decode base64 tile data:", error);
      return [];
    }
  }

  public getTilemapData(): TilemapData {
    return this.tilemapData;
  }
}