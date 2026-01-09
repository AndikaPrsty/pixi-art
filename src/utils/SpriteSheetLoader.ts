import { Assets } from "pixi.js";

export interface ExtendedSpriteSheet {
  frames: Record<string, unknown>;
  meta: {
    app?: string;
    version?: string;
    image: string;
    format?: string;
    size?: { w: number; h: number };
    scale?: string;
    frameTags?: Array<{
      name: string;
      from: number;
      to: number;
      direction: string;
      color?: string;
    }>;
    layers?: Array<{
      name: string;
      opacity: number;
      blendMode: string;
    }>;
    slices?: unknown[];
  };
  animations?: Record<string, unknown[]>;
}

export interface LegacySpriteSheet {
  frames: Record<string, unknown>;
  meta?: unknown;
  animations: Record<string, unknown[]>;
}

export class SpriteSheetLoader {
  /**
   * Detects if a sprite sheet uses the new extended format
   */
  static isExtendedFormat(
    spriteSheet: unknown,
  ): spriteSheet is ExtendedSpriteSheet {
    const sheet = spriteSheet as any;
    return (
      sheet.meta &&
      (sheet.meta.frameTags !== undefined || sheet.meta.layers !== undefined) &&
      !sheet.animations
    );
  }

  /**
   * Converts extended format to legacy format for compatibility
   */
  static convertExtendedToLegacy(
    extendedSheet: ExtendedSpriteSheet,
  ): LegacySpriteSheet {
    const animations: Record<string, unknown[]> = {};

    console.log(`[SpriteSheetLoader] Converting extended format. FrameTags:`, extendedSheet.meta.frameTags);

    if (extendedSheet.meta.frameTags && extendedSheet.meta.frameTags.length > 0) {
      // Create animations from frameTags
      for (const frameTag of extendedSheet.meta.frameTags) {
        const animationFrames: unknown[] = [];

        console.log(`[SpriteSheetLoader] Processing frameTag: ${frameTag.name}, range: ${frameTag.from}-${frameTag.to}`);

        // Handle both array and object frame formats
        let frameData: any[];
        if (Array.isArray(extendedSheet.frames)) {
          frameData = extendedSheet.frames;
        } else {
          frameData = Object.values(extendedSheet.frames);
        }

        console.log(`[SpriteSheetLoader] Total frames available: ${frameData.length}`);

        for (let i = frameTag.from; i <= frameTag.to; i++) {
          if (i < frameData.length) {
            const frame = frameData[i];
            console.log(`[SpriteSheetLoader] Processing frame index ${i}, filename: ${frame.filename}`);
            
            try {
              const texture = Assets.get(extendedSheet.meta.image);
              console.log(`[SpriteSheetLoader] Texture asset for ${extendedSheet.meta.image}:`, !!texture);
              
              if (texture && texture.textures) {
                // Try different texture key strategies
                const possibleKeys = [
                  frame.filename, // e.g., "Railing_Gate_32x32_1 #open 0.png"
                  frame.filename?.replace('.png', ''), // without extension
                  `frame_${i}`,   // e.g., "frame_0"
                  `${i}`,         // e.g., "0"
                ];
                
                let frameTexture = null;
                for (const key of possibleKeys) {
                  if (texture.textures[key]) {
                    frameTexture = texture.textures[key];
                    console.log(`[SpriteSheetLoader] Found frame ${i} with key: ${key}`);
                    break;
                  }
                }
                
                if (frameTexture) {
                  animationFrames.push(frameTexture);
                } else {
                  console.warn(`[SpriteSheetLoader] No texture found for frame ${i}, tried keys:`, possibleKeys);
                }
              }
            } catch (error) {
              console.error(`[SpriteSheetLoader] Error getting texture for frame ${i}:`, error);
            }
          }
        }

        if (animationFrames.length > 0) {
          animations[frameTag.name] = animationFrames;
          console.log(`[SpriteSheetLoader] Created animation '${frameTag.name}' with ${animationFrames.length} frames`);
        } else {
          console.warn(`[SpriteSheetLoader] No frames found for animation: ${frameTag.name}`);
        }
      }

      // If we have multiple single-frame animations, also create a combined animation
      // This handles cases like railing_gate with multiple frame tags
      if (extendedSheet.meta.frameTags.length > 1) {
        const allFrames: unknown[] = [];
        const frameKeys = Object.keys(extendedSheet.frames);
        
        try {
          const texture = Assets.get(extendedSheet.meta.image);
          if (texture && texture.textures) {
            for (const frameKey of frameKeys) {
              if (texture.textures[frameKey]) {
                allFrames.push(texture.textures[frameKey]);
              }
            }
            
            if (allFrames.length > 0) {
              // Create combined animation using image name
              const imageName = extendedSheet.meta.image.replace('.png', '');
              animations[imageName] = allFrames;
              console.log(`[SpriteSheetLoader] Created combined animation '${imageName}' with ${allFrames.length} frames`);
            }
          }
        } catch (error) {
          console.error(`[SpriteSheetLoader] Error creating combined animation:`, error);
        }
      }
    } else {
      console.log(`[SpriteSheetLoader] No frameTags found, creating animation from all frames`);
      // If no frameTags, create a single animation from all frames
      
      // Handle both array and object frame formats
      let frameData: any[];
      if (Array.isArray(extendedSheet.frames)) {
        // Array format: frames are in array
        frameData = extendedSheet.frames;
        console.log(`[SpriteSheetLoader] Array format detected with ${frameData.length} frames`);
      } else {
        // Object format: convert to array
        frameData = Object.values(extendedSheet.frames);
        console.log(`[SpriteSheetLoader] Object format detected with ${frameData.length} frames`);
      }
      
      if (frameData.length > 0) {
        try {
          const texture = Assets.get(extendedSheet.meta.image);
          console.log(`[SpriteSheetLoader] Main texture:`, !!texture);
          console.log(`[SpriteSheetLoader] Available texture keys:`, texture ? Object.keys(texture.textures || {}) : 'none');
          
          if (texture && texture.textures) {
            const animationFrames: unknown[] = [];
            
            // For array format, try different texture key strategies
            for (let i = 0; i < frameData.length; i++) {
              const frame = frameData[i];
              const possibleKeys = [
                frame.filename, // e.g., "Railing_Gate_32x32_1 0.png"
                `frame_${i}`,   // e.g., "frame_0"
                `${i}`,         // e.g., "0"
                frame.filename?.replace('.png', '') // without extension
              ];
              
              let frameTexture = null;
              for (const key of possibleKeys) {
                if (texture.textures[key]) {
                  frameTexture = texture.textures[key];
                  console.log(`[SpriteSheetLoader] Found frame ${i} with key: ${key}`);
                  break;
                }
              }
              
              if (frameTexture) {
                animationFrames.push(frameTexture);
              } else {
                console.warn(`[SpriteSheetLoader] No texture found for frame ${i}, tried keys:`, possibleKeys);
              }
            }

            if (animationFrames.length > 0) {
              // Create combined animation using image name
              const imageName = extendedSheet.meta.image.replace('.png', '');
              animations[imageName] = animationFrames;
              console.log(`[SpriteSheetLoader] Created animation '${imageName}' with ${animationFrames.length}/${frameData.length} frames`);
            } else {
              console.error(`[SpriteSheetLoader] No valid frames found for animation`);
            }
          }
        } catch (error) {
          console.error(`[SpriteSheetLoader] Error creating animation:`, error);
        }
      }
    }

    console.log(`[SpriteSheetLoader] Final animations:`, Object.keys(animations));

    return {
      frames: extendedSheet.frames,
      meta: extendedSheet.meta,
      animations,
    };
  }

  /**
   * Loads a sprite sheet and handles both formats
   */
  static loadSpriteSheet(name: string): LegacySpriteSheet | null {
    try {
      console.log(`[SpriteSheetLoader] Attempting to load: ${name}.json`);
      const spriteSheet = Assets.get(`${name}.json`);

      if (!spriteSheet) {
        console.log(`[SpriteSheetLoader] No sprite sheet found for: ${name}`);
        return null;
      }

      console.log(`[SpriteSheetLoader] Raw sprite sheet for ${name}:`, spriteSheet);

      // Check if it already has animations (legacy format)
      if (spriteSheet.animations && Object.keys(spriteSheet.animations).length > 0) {
        console.log(`[SpriteSheetLoader] Loading legacy format: ${name}`);
        return spriteSheet as LegacySpriteSheet;
      }

      // Check if it's extended format (has frameTags/layers but no animations)
      if (this.isExtendedFormat(spriteSheet)) {
        console.log(`[SpriteSheetLoader] Loading extended format: ${name}`);
        const converted = this.convertExtendedToLegacy(spriteSheet);
        console.log(`[SpriteSheetLoader] Converted animations for ${name}:`, Object.keys(converted.animations));
        return converted;
      }

      // Handle individual frames format (has frames but no animations or frameTags)
      if (spriteSheet.frames && Object.keys(spriteSheet.frames).length > 0) {
        console.log(`[SpriteSheetLoader] Loading individual frames format: ${name}`);
        const converted = this.convertFramesToLegacy(spriteSheet, name);
        console.log(`[SpriteSheetLoader] Converted animations for ${name}:`, Object.keys(converted.animations));
        return converted;
      }

      console.warn(`[SpriteSheetLoader] Unknown sprite sheet format for: ${name}`);
      return null;
    } catch (error) {
      console.error(
        `[SpriteSheetLoader] Failed to load sprite sheet: ${name}`,
        error,
      );
      return null;
    }
  }

  /**
   * Gets animation names from a sprite sheet
   */
  static getAnimationNames(spriteSheet: LegacySpriteSheet): string[] {
    return Object.keys(spriteSheet.animations || {});
  }

  /**
   * Checks if a sprite sheet has animations
   */
  static hasAnimations(spriteSheet: LegacySpriteSheet): boolean {
    return (
      spriteSheet.animations && Object.keys(spriteSheet.animations).length > 0
    );
  }

  /**
   * Converts individual frames format to legacy format
   */
  static convertFramesToLegacy(framesSheet: any, name: string): LegacySpriteSheet {
    const animations: Record<string, unknown[]> = {};
    
    console.log(`[SpriteSheetLoader] Converting individual frames format for ${name}`);
    
    const frameKeys = Object.keys(framesSheet.frames);
    console.log(`[SpriteSheetLoader] Available frame keys:`, frameKeys);
    
    if (frameKeys.length > 0) {
      try {
        const texture = Assets.get(framesSheet.meta.image);
        console.log(`[SpriteSheetLoader] Texture asset for ${framesSheet.meta.image}:`, !!texture);
        
        if (texture && texture.textures) {
          const animationFrames = frameKeys.map(
            (frameKey) => texture.textures[frameKey],
          ).filter(frame => frame !== undefined);

          if (animationFrames.length > 0) {
            // Create animation using the object name
            animations[name] = animationFrames;
            console.log(`[SpriteSheetLoader] Created animation '${name}' with ${animationFrames.length} frames`);
          }
        }
      } catch (error) {
        console.error(`[SpriteSheetLoader] Error creating animation from frames:`, error);
      }
    }

    return {
      frames: framesSheet.frames,
      meta: framesSheet.meta,
      animations,
    };
  }
}