import { AnimatedSprite, Assets } from "pixi.js";
import { Map } from "./Map";

export class Player {
	public map!: Map

	constructor() {
	}

	public async add(map: Map): Promise<void> {
		const sheet = Assets.get("idle.json");
		const player = new AnimatedSprite(sheet.animations.idle);
		map.container.addChild(player);
		player.animationSpeed = 0.2
		player.play();
	}
}
