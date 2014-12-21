
if ( ! Detector.webgl ) alert("Your browser does not support WebGL. Please try Chrome or Firefox.") //webGL support check
//Audio
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.oAudioContext;
var context = new AudioContext();
var droneGain = context.createGain(); //drone gain
var reverbGain = context.createGain(); //reverb gain
var padGain = context.createGain(); //pad gain
var dryGain = context.createGain(); //master dry gain
var masterGain = context.createGain(); // master gain
var panner = context.createPanner();
panner.panningModel = "equalpower";
var leadGain = context.createGain(); // lead gain
var percGain = context.createGain();	//kick gain
var pad2Gain = context.createGain();

var comp = context.createDynamicsCompressor(); // compressor
comp.threshold = -5;
comp.ratio = 20; 

var reverb = context.createConvolver(); //reverb

leadGain.gain.value = 0.20;
droneGain.gain.value = 0.17;
padGain.gain.value = 0.07;
percGain.gain.value = 1.5;
pad2Gain.gain.value = 0.003;

dryGain.gain.value = 0.32;
reverbGain.gain.value = 0.3;

//connections
reverbGain.connect(comp);
comp.connect(context.destination);
reverb.connect(reverbGain);
droneGain.connect(panner);
padGain.connect(reverb);
leadGain.connect(reverb);
leadGain.connect(dryGain);
percGain.connect(reverb);
percGain.connect(dryGain);
leadGain.connect(dryGain);
panner.connect(dryGain);
panner.connect(reverb);
panner.setPosition(0,0,0);
padGain.connect(dryGain);
reverbGain.connect(masterGain);
dryGain.connect(masterGain);
pad2Gain.connect(dryGain);
pad2Gain.connect(reverb);
masterGain.connect(context.destination);

var request = new XMLHttpRequest();
//loading the reverb
request.open('GET', 'rev.mp3' , true);
request.responseType = "arraybuffer";
request.onload = function(){
        context.decodeAudioData(request.response, function(buffer){
        reverb.buffer = buffer;
        $('#button').html('Start');
    });
};
request.send();

//global vars
var renderer, scene, camera;
var mesh, material,outlinemat, geometry,raycaster, projector;
var composer,rgbEffect,filmPass,effectFilm, staticFx;
var rgbanimate = false;
var cubes = []; //actually triangles
var mouseX = 0;
var mouseY = 0;
var drone,pad,pad2,perc,Lead;

//audio


//drone
function Drone(){
	var now = context.currentTime;
	this.frequency = 196.00;
	this.oscillators = [];
	//create three oscillators
	this.osc1 = context.createOscillator();
	this.osc1.frequency.value = this.frequency;
	this.oscillators.push(this.osc1);

	this.osc2 = context.createOscillator();
	this.osc2.frequency.value = this.frequency;
	this.osc2.detune.value = 400; //4 semitones
	this.oscillators.push(this.osc2);
	
	this.osc3 = context.createOscillator();
	this.osc3.frequency.value = this.frequency;
	this.osc3.detune.value = 900; //9 semitones
	this.oscillators.push(this.osc3);

	this.osc5 = context.createOscillator();
	this.osc5.frequency.value = this.frequency;
	this.osc5.detune.value = 1200;//-5 semitones
	this.oscillators.push(this.osc5);

	//envelope
	this.env = context.createGain();
	this.env.connect(droneGain);
	this.env.gain.value = 0;

	//connections
	for(var i=0;i < this.oscillators.length; i++){
		this.oscillators[i].connect(this.env);
		this.oscillators[i].type = 0;
		this.oscillators[i].start(now);
	}
	this.env.gain.setValueAtTime(this.env.gain.value, now);
	this.env.gain.linearRampToValueAtTime(1, now + 5);
	this.env.gain.linearRampToValueAtTime(0, now + 9)

}

Drone.prototype.change = function(){
	this.random = Math.round(Math.random() * 1);
	
	this.newfrequency;
	switch(this.random){
		case 0:
			this.newfrequency = 196.00;
		break;
		case 1:
  			this.newfrequency = 146.83; //D3
  		break;	
		
	}

	var that = this;
	var now = context.currentTime;
	for(var i=0; i < this.oscillators.length; i++){
		this.oscillators[i].frequency.value = that.newfrequency;
	}
	this.env.gain.setValueAtTime(this.env.gain.value, now);
	this.env.gain.linearRampToValueAtTime(1, now + 4);
	this.env.gain.linearRampToValueAtTime(0, now + 9);
}

//Kick
function Perc(){
	this.osc = context.createOscillator();
	this.osc.frequency.value = 400;
	this.env = context.createGain();
	this.env.gain.value = 0;
	this.osc.connect(this.env);
	this.env.connect(percGain);
	var that = this;
	
	var startTime = Math.random() * 5000;
	setTimeout(function(){
		var now = context.currentTime;
		that.osc.start(now);
		that.osc.frequency.setValueAtTime(that.osc.frequency.value, now);
		that.osc.frequency.linearRampToValueAtTime(60, now + 0.005);
		that.env.gain.setValueAtTime(that.env.gain.value, now);
		that.env.gain.linearRampToValueAtTime(1, now + 0.005);
		this.decayTime = now + (Math.random() * 6 + 3);
		that.env.gain.linearRampToValueAtTime(0, this.decayTime);
		
		that.osc.stop(now + (this.decayTime + 1) );
		setTimeout(function(){
			that.env.disconnect(); //garbage collection
		},11000);
		rgbanimate = true;

		setTimeout(function(){
			rgbanimate = false;
		},300);
	},startTime);
	

}
//Pad
function Pad(){
	this.osc = context.createOscillator();
	this.env = context.createGain();
	this.env.connect(padGain);
	this.env.gain.value = 0;

	this.random = Math.round(Math.random() * 6);
	this.frequency;
	var that = this;

	switch(this.random){
	 	case 0: 
	 		this.frequency = 392.00;
	 	break;
	 	
	 	case 1:
	 		this.frequency = 493.88;
	 	break;

	 	case 2:
	 		this.frequency = 659.26;
	 	break;

	 	case 3:
	 		this.frequency = 783.99;
	 	break;

	 	case 4:
	 		this.frequency = 293.66 * 2;
	 	break;

	 	case 5:
	 		this.frequency = 493.88 * 2;
	 	break;

	 	case 6:
	 		this.frequency = 587.33;
	 	break;


	}

 	this.osc.frequency.value = this.frequency;
 	this.osc.connect(this.env);
 	var now = context.currentTime;
 	this.osc.start(now);
 	this.env.gain.setValueAtTime(this.env.gain.value, now);
	this.env.gain.linearRampToValueAtTime(1, now + 4);
	this.env.gain.linearRampToValueAtTime(0, now + 10);
	this.osc.stop(now + 11);
	setTimeout(function(){
		that.env.disconnect();
	},11000);
	
}

//lead
function lead(face){
	this.face = face;
	this.osc = context.createOscillator();
	this.osclow = context.createOscillator();
	this.delay = context.createDelay();
	this.feedback = context.createGain();
	this.feedback.gain.value = 0.79;
	this.delay.delayTime.value = (Math.random() * 2) + 0.3;
	var that = this;
	this.env = context.createGain();
	this.envlow = context.createGain();
	this.frequency;
	switch(face){
		case 0:
			this.frequency = 659.26 ;
		break;

		case 1:
			this.frequency = 783.99;
		break;

		case 2:
			this.frequency = 587.33 * 2;
		break;

		case 3:
			this.frequency = 659.26 * 2;
		break;

		case 4:
			this.frequency = 783.99 * 2;
		break;

		case 5:
			this.frequency = (493.88 * 2) * 2;
		break;

		case 6:
			this.frequency = (392.00 * 2) * 2;
		break;

		case 7:
			this.frequency = 587.33 * 2 ;
		break;
	}

	this.mult = Math.round(Math.random()) + 1;
	//console.log(this.mult);
	this.osc.frequency.value = this.frequency;
	this.osclow.frequency.value = this.frequency / 2;
	var now = context.currentTime;
	this.osc.connect(this.env);
	this.osclow.connect(this.envlow);
	this.envlow.gain.value = 0;
	this.env.gain.value = 0;
	this.envlow.connect(this.delay);
	this.envlow.connect(leadGain);
	this.env.connect(this.delay);
	this.env.connect(leadGain);
	this.delay.connect(this.feedback);
	this.feedback.connect(this.delay);
	this.delay.connect(leadGain);
	this.osc.start(now);
	this.osclow.start(now);
	this.env.gain.setValueAtTime(this.env.gain.value, now);
	this.env.gain.linearRampToValueAtTime(1, now + 0.04);
	this.env.gain.linearRampToValueAtTime(0, now + 0.290);

	
	this.osclow.stop(now + 0.4);
	this.envlow.gain.setValueAtTime(this.env.gain.value, now);
	this.envlow.gain.linearRampToValueAtTime(1, now + 0.05);
	this.envlow.gain.linearRampToValueAtTime(0, now + 0.290);
	this.osc.stop(now + 0.4);
	setTimeout(function(){
		that.env.gain.value = 0;
		that.delay.disconnect(); //garbage collection
		that.env.disconnect(); // grabge collection
	},24000);
	
}

//thirdsound
function Pad2(){
	this.osc = context.createOscillator();
	this.osc2 = context.createOscillator();
	this.osc.type = 'square';
	this.osc2.type = 'square';
	this.env = context.createGain();

	this.osc.connect(this.env);
	this.osc.connect(this.env);
	this.env.connect(pad2Gain);

	this.frequency;
	this.random = Math.round(Math.random() * 6);
	switch(this.random){
	 	case 0: 
	 		this.frequency = 392.00 * 2;
	 	break;
	 	
	 	case 1:
	 		this.frequency = 493.88 * 2;
	 	break;

	 	case 2:
	 		this.frequency = 659.26 * 2;
	 	break;

	 	case 3:
	 		this.frequency = 783.99 * 2;
	 	break;

	 	case 4:
	 		this.frequency = (293.66 * 2) * 2;
	 	break;

	 	case 5:
	 		this.frequency = (493.88 * 2) * 2;
	 	break;

	 	case 6:
	 		this.frequency = (587.33) * 2;
	 	break;

	}
	this.osc.frequency.value = this.frequency;
	this.osc2.frequency.value = this.frequenc;
	this.osc2.detune.value = 15;
	this.osc.detune.value = -15;

	var now = context.currentTime;
	this.osc.start(now);
	this.osc2.start(now);
	this.env.gain.value = 0;
	this.env.gain.setValueAtTime(this.env.gain.value, now);
	this.env.gain.linearRampToValueAtTime(1, now + 4);
	this.env.gain.linearRampToValueAtTime(0, now + 16);

	this.osc.stop(now + 17);
	this.osc2.stop(now + 17);

	setTimeout(function(){
		this.env.disconnect(); // garbage collection
	},18000);

}

//Anim Setup
function setup(){
	//initials
	renderer = new THREE.WebGLRenderer({
        preserveDrawingBuffer: true,
        antialias: true
    });
	renderer.setSize(window.innerWidth,window.innerHeight);
	document.body.appendChild(renderer.domElement);
	//set background color
	renderer.setClearColor( 0xffffff);
	camera = new THREE.PerspectiveCamera(50,window.innerWidth /window.innerHeight,1,10000);
	camera.position.z = 500;
	scene = new THREE.Scene();
	
	//octahedron
	geometry = new THREE.OctahedronGeometry(100,0);
	material = new THREE.MeshNormalMaterial({shading: THREE.FlatShading });
	outlinemat = new THREE.MeshBasicMaterial({fog: true, wireframe: true,color: 0x000000, wireframeLineWidth: 10 });
	mesh = new THREE.Mesh(geometry,material);
	mesh.id = 'oct';
	meshout = new THREE.Mesh(geometry,outlinemat);
	
	//background stuff
	var cubeg = new THREE.TetrahedronGeometry(25,0);
	var cubematerial = new THREE.MeshBasicMaterial({ color: 0x000000 , wireframe: true, wireframeLinewidth: 1 , fog: true});
	
	for (var i = 0; i < 2000; i++){
		var cube = new THREE.Mesh(cubeg,cubematerial);
		var cube2 =  new THREE.Mesh(cubeg,cubematerial);
		
		cube.position.x = Math.random() * 5000 - 2500;
		cube.position.y = Math.random() * 5000 - 2500;
		cube.position.z = Math.random() * 10000 - 10000;
		cube.rotation.x = Math.random() * 6;
		cube.rotation.y = Math.random() * 6;
		cube.rotation.z = Math.random() * 6;
		cubes.push(cube);
		cube.material.color.setHSL(Math.random(), Math.random(), Math.random() );
		scene.add(cube);

	}

	//ray and projector for interactivity
	raycaster = new THREE.Raycaster();
	projector = new THREE.Projector();
	
	//scene
	scene.add(mesh);
	scene.add(meshout);

	//postprocessing
	composer = new THREE.EffectComposer( renderer );
	composer.addPass( new THREE.RenderPass( scene, camera ) );
	
	effectFilm = new THREE.ShaderPass(THREE.FilmShader);
	effectFilm.uniforms.grayscale.value = false;
	effectFilm.uniforms['nIntensity'].value = 0.8;
	composer.addPass( effectFilm );
	
	//rgb shift effect
	rgbEffect = new THREE.ShaderPass( THREE.RGBShiftShader );
	rgbEffect.uniforms[ 'amount' ].value = 0.001;
	rgbEffect.renderToScreen = true;
	composer.addPass( rgbEffect );
	
	//mouseevents
	renderer.domElement.addEventListener('click',clickfunc,false);
	renderer.domElement.addEventListener('mousemove',movefunc,false);
	renderer.domElement.addEventListener('mouseup',mouseup,false);
	window.addEventListener( 'resize', onWindowResize, false );

	//window resize callback
	function onWindowResize() {

				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize( window.innerWidth, window.innerHeight );
	}

	//clickevent callback
	function clickfunc(event){
		event.preventDefault();
		var mouse = new THREE.Vector2();
		mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
		var vector = new THREE.Vector3(mouse.x,mouse.y,1);
		projector.unprojectVector( vector, camera );
		raycaster.set( camera.position, vector.sub( camera.position ).normalize() );
		var intersects = raycaster.intersectObjects( scene.children );

		cubes[0].material.color.setHSL(Math.random(), Math.random(), Math.random() );
		
		if(intersects.length > 0){
			for(var i=0; i < intersects.length; i++){
				//face detection
				if(intersects[i].object.id === "oct"){
					
					Lead = new lead(intersects[i].faceIndex);
					
					renderer.autoClearColor = false;
					
					rgbanimate = true;
				}
			}
		}	
	}
	//mouse move callback
	function movefunc(event){
		event.preventDefault();
		mouseX = ( event.clientX - window.innerWidth / 2 );
		mouseY = ( event.clientY - window.innerHeight / 2 );
		
	}

	function mouseup(){
		rgbanimate = false;
	}
}

//animation
function draw(){

	setTimeout( function() {
        requestAnimationFrame( draw );
    }, 1000 / 24 );
	//octa rotation
	mesh.rotation.y = Math.sin(Date.now() * 0.0001) * 2;
	meshout.rotation.y = mesh.rotation.y
	mesh.rotation.z = Date.now() * 0.00005;
	meshout.rotation.z = mesh.rotation.z;
	mesh.rotation.x  = Date.now() * 0.00005;
	meshout.rotation.x = mesh.rotation.x;

	//cubes movement
	for( var i = 0 ; i < (cubes.length / 2); i++){	
		cubes[i].rotation.y = cubes[i].rotation.y + (Math.random() * 0.02 ) ;
		cubes[i].rotation.x = cubes[i].rotation.x + (Math.random() * 0.01 ) ;	
	}

	//camera
	camera.position.y += ( mouseY - camera.position.y ) * 0.0005;
	camera.position.x += ( mouseX - camera.position.x) * 0.002;	
	//console.log((mouseX / window.innerWidth));
	panner.setPosition((mouseX / window.innerWidth),0,1);

	camera.position.z += Math.sin( Date.now() * 0.0005 ) * 1;
	camera.lookAt( scene.position );

	if(rgbanimate){
		rgbEffect.uniforms[ 'amount' ].value = rgbEffect.uniforms[ 'amount' ].value + Math.sin(0.001);
		setTimeout(function(){
			rgbanimate = false;
			rgbEffect.uniforms[ 'amount' ].value = rgbEffect.uniforms[ 'amount' ].value - Math.sin(0.001);
		}, 90)

	}
	effectFilm.uniforms['nIntensity'].value = Math.random() * 0.5;
	
	//render
	composer.render(0.1);
	

}

function audioStart(){
	drone = new Drone();

	setInterval(function(){
		cubes[0].material.color.setHSL(Math.random(), Math.random(), Math.random() );
		drone.change();
		rgbEffect.uniforms[ 'amount' ].value = rgbEffect.uniforms[ 'amount' ].value + Math.sin(0.003);
		setTimeout(function(){
			rgbanimate = false;
			rgbEffect.uniforms[ 'amount' ].value = rgbEffect.uniforms[ 'amount' ].value - Math.sin(0.003);
		}, 90)
	},10000);

	setTimeout(function(){
		setInterval(function(){
			pad = new Pad();
		}, 10000)
	},10000);

	setTimeout(function(){
		setInterval(function(){
			perc = new Perc();
		}, 7000)
	},20000);

	setTimeout(function(){
		setInterval(function(){
			pad2 = new Pad2();
		}, 1000)
	},40000);
}
//init
window.onload = function(){
	setup();
	draw();
	$('canvas').css({'opacity':'0.1'});

	$('#button').click(function(){
		$('#container').animate({opacity:0},200,function(){
			console.log('test');
			$('#container').hide();
			$('canvas').animate({opacity:1},1000,function(){
				audioStart();
			});
		});
	});
	
};
