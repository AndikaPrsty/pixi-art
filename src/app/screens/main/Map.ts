import { AnimatedSprite, Assets, Container, Sprite } from "pixi.js";
import { MainScreen } from "./MainScreen";

export class Map {
	public screen!: MainScreen;
	public container = new Container();

	constructor() {
		Assets.load("garden_layer_1.png");
		Assets.load("garden_layer_2.png");
		Assets.load("wind_turbine.json");
	}

	public async show(screen: MainScreen): Promise<void> {
		const layer1 = Sprite.from("garden_layer_1.png");
		const layer2 = Sprite.from("garden_layer_2.png");
		const wind_turbine_sheet = Assets.get("wind_turbine.json")
		const wind_turbine = new AnimatedSprite(wind_turbine_sheet.animations.wind_turbin)
		wind_turbine.animationSpeed = 0.2
		wind_turbine.play()

		this.screen = screen;
		this.container.addChild(layer1, layer2, wind_turbine)
		this.screen.mainContainer.addChild(this.container);
		wind_turbine.anchor.set(0.5, 0.5)
		wind_turbine.x = (this.container.width / 2);
		wind_turbine.y = (this.container.height / 2);
	}

	public async addPlayer(player: AnimatedSprite) {
		this.container.addChild(player);
	}
}
