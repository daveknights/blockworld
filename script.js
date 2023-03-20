import * as THREE from 'three';
import { OrbitControls } from 'https://unpkg.com/three@0.141.0/examples/jsm/controls/OrbitControls.js';

class ThreeJSDefaults {
	constructor(fov, apsectRatio, near, far) {
		this.blockScene = new THREE.Scene();
		this.materialScene = new THREE.Scene();
		this.blockCamera = new THREE.PerspectiveCamera(fov, apsectRatio, near, far);
		this.materialCamera = new THREE.OrthographicCamera( window.innerWidth / - 2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / - 2, 1, 1000 );
		this.renderer = new THREE.WebGLRenderer({antialias: true});
		this.controls = new OrbitControls(this.blockCamera, this.renderer.domElement);
	}

	onWindowResize = () => {
	  this.blockCamera.aspect = window.innerWidth / window.innerHeight;
	  this.blockCamera.updateProjectionMatrix();
	  this.materialCamera.aspect = window.innerWidth / window.innerHeight;
	  this.materialCamera.updateProjectionMatrix();
	  this.renderer.setSize(window.innerWidth, window.innerHeight);
	}
};

class Block {
    constructor(texture, opacity, transparent) {
		this.texture = texture;
		this.opacity = opacity;
		this.transparent = transparent;
    }

    create() {
        return new THREE.Mesh(
			new THREE.BoxGeometry(1, 1, 1),
			new THREE.MeshLambertMaterial({map: this.texture, opacity: this.opacity, transparent: this.transparent})
		);
    }
};

class MaterialPicker {
	constructor(materials) {
		this.materials = materials;
		this.materialIndicator = new THREE.Mesh(new THREE.PlaneGeometry(30, 3), new THREE.MeshBasicMaterial({color: 0xffff00}));
		this.materialSquares = [];
	}

	create() {
		const materialPicker = new THREE.Mesh(new THREE.PlaneGeometry((Object.keys(this.materials).length * 40) + 10, 50),
											new THREE.MeshBasicMaterial({color: 0x444444}));
		let xPos =  -((Object.keys(this.materials).length * 40) - 40) / 2;

		this.materialIndicator.position.set(xPos, 17, 1);
		materialPicker.add(this.materialIndicator);

		for (const [material, texture] of Object.entries(this.materials)) {
			const materialSquare = new THREE.Mesh(
				new THREE.PlaneGeometry(30, 30),
				new THREE.MeshBasicMaterial({map: texture})
			);
			materialSquare.position.set(xPos, 0, 0);
			materialSquare.name = material;

			this.materialSquares.push(materialSquare);

			materialPicker.add(materialSquare);

			xPos += 40;
		}

		return materialPicker;
	}

	getMaterialSquares() {
		return this.materialSquares;
	}

	setIndicatorPosition(indicatorXPos) {
		this.materialIndicator.position.x = indicatorXPos;
	}
}

class BlockWorld extends ThreeJSDefaults {
    constructor(cameraSettings) {
		super(cameraSettings);

		this.blockScene.background = new THREE.Color( 0x88bbdd );
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setPixelRatio( window.devicePixelRatio );
		document.body.appendChild(this.renderer.domElement);
        this.blockCamera.position.set(0,5,30);
        this.materialCamera.position.set(0,window.innerHeight / 2 - 70,35);
		this.controls.maxPolarAngle = Math.PI/2 - 0.1;
		this.controls.update();
	}

    init() {
        const objects = [];
		const materials = {
			grass: new THREE.TextureLoader().load('textures/grass.png'),
			brick: new THREE.TextureLoader().load('textures/brick.png'),
			dirt: new THREE.TextureLoader().load('textures/dirt.png'),
			diamond: new THREE.TextureLoader().load('textures/diamond.png'),
			lava: new THREE.TextureLoader().load('textures/lava.png'),
			stone: new THREE.TextureLoader().load('textures/stone.png'),
			water: new THREE.TextureLoader().load('textures/water.png'),
			wood: new THREE.TextureLoader().load('textures/wood.png'),
		};
        const ghostBox = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshLambertMaterial({
                color: 0xff0000,
                opacity: 0.5,
                transparent: true,
            })
        );
        const planeMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(50, 50),
            new THREE.MeshBasicMaterial({color: 0xcccccc})
        );
        const blockRaycaster = new THREE.Raycaster();
        const materialRaycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
		const ambientLight = new THREE.AmbientLight( 0x666666 );
		const directionalLight = new THREE.DirectionalLight( 0xffffff );
		const animate = () => {
            this.renderer.render(this.blockScene, this.blockCamera);
			this.renderer.autoClear = false;
			this.renderer.render(this.materialScene, this.materialCamera);
        }

		const materialPicker = new MaterialPicker(materials);
		let chosenMaterial = 'grass';
		let mouseDown = false;
		let dragging = false;
		let isShiftDown = false;

        planeMesh.rotateX(-Math.PI / 2);
        ghostBox.position.set(1, 1, 1);
		directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
		objects.push(planeMesh);

        this.blockScene.add(planeMesh, ghostBox, ambientLight, directionalLight);
		this.materialScene.add(materialPicker.create());

		window.addEventListener('keydown', e => e.key === 'Shift' && (isShiftDown = true));
		window.addEventListener('keyup', e => e.key === 'Shift' && (isShiftDown = false));

		window.addEventListener('mousedown', () => {
			document.body.style.cursor = 'pointer';
			mouseDown = true
		});
        window.addEventListener('mousemove', e => {
			mouseDown && (dragging = true);

            pointer.set( ( e.clientX / window.innerWidth ) * 2 - 1, - ( e.clientY / window.innerHeight ) * 2 + 1 );
			blockRaycaster.setFromCamera( pointer, this.blockCamera );

			const intersects = blockRaycaster.intersectObjects( objects, false );

			if ( intersects.length > 0 ) {
				const intersect = intersects[ 0 ];

				ghostBox.position.copy( intersect.point ).add( intersect.face.normal );
				ghostBox.position.set(intersect.point.x, intersect.point.y + 0.5, intersect.point.z);
				ghostBox.position.divideScalar( 1 ).floor().multiplyScalar( 1 ).addScalar( 0.5 );
			}
        });
		window.addEventListener('mouseup', e => {
			document.body.style.cursor = 'default';
			pointer.set( ( e.clientX / window.innerWidth ) * 2 - 1, - ( e.clientY / window.innerHeight ) * 2 + 1 );
			blockRaycaster.setFromCamera( pointer, this.blockCamera );
			materialRaycaster.setFromCamera( pointer, this.materialCamera );

			const intersects = blockRaycaster.intersectObjects( objects, false );
			const colourIntersects =  materialRaycaster.intersectObjects(materialPicker.getMaterialSquares());

			if ( colourIntersects.length > 0 ) {
				const colourIntersect = colourIntersects[ 0 ];

				chosenMaterial = colourIntersect.object.name;
				materialPicker.setIndicatorPosition(colourIntersect.object.position.x);
			} else if ( intersects.length > 0 ) {
				const intersect = intersects[ 0 ];

				if (isShiftDown) {
					if ( intersect.object !== planeMesh ) {
						this.blockScene.remove( intersect.object );
						objects.splice( objects.indexOf( intersect.object ), 1 );
					}
				} else {
					if (!dragging) {
						let opacity = 1;
						let transparency = false;

						if (chosenMaterial === 'water') {
							opacity = 0.7;
							transparency = true;
						}
						const block = new Block(materials[chosenMaterial], opacity, transparency).create();

						block.position.copy( intersect.point ).add( intersect.face.normal );
						block.position.set(intersect.point.x, intersect.point.y + 0.5, intersect.point.z);
						block.position.divideScalar( 1 ).floor().multiplyScalar( 1 ).addScalar( 0.5 );

						this.blockScene.add( block );

						objects.push( block );
					}
				}
			}

			mouseDown = false;
    		dragging = false;
		});

        window.addEventListener('resize', this.onWindowResize, false);

        this.renderer.setAnimationLoop(animate);
    }
}

new BlockWorld(75, window.innerWidth / window.innerHeight, 0.1, 1000).init();
