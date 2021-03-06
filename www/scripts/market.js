var trackedUser = "bb30ed5f-c387-43d3-89e3-d1ac95d077ab";
var websock;
var map = null;
var markers = {};
var changed = false;
var follow = false;

$(window).load(function() {
	var domainAndPort = location.hostname + (location.port ? ':' + location.port : '');
	var webSocketUrl = "ws://" + domainAndPort + "/locations/";
	var fullUrl = webSocketUrl + trackedUser;
	websock = new WebSocket(fullUrl);
	websock.onopen= function(evt) {
		console.log("opened web socket");
		console.log(evt);
	};
	
	websock.onclose = function(evt) {
		console.log("closed web socket");
		console.log(evt);
	};
	
	websock.onmessage = function(evt) {
		var userPayload = JSON.parse(evt.data);
		var myLatLng = {lat: userPayload.Latitude, lng: userPayload.Longitude};
		
		var marker = markers[userPayload.Id];
		if (marker === null || marker === undefined) {
			marker = new AnimatedMarker(userPayload.Id);
			markers[userPayload.Id] = marker;
		}
		
		marker.moveTo(userPayload.Latitude,userPayload.Longitude,userPayload.LocatedAt);
		
		if (!changed) {
		  	map.setCenter(myLatLng);
			changed = true;	
		}
	};
	
	websock.onerror = function(evt) {
		console.log("websocket ERROR");
		console.log(evt);	
	};
});

function loadMap() {
    map = new google.maps.Map(document.getElementById('map'), {
       center: {lat: -34.397, lng: 150.644},
		zoom: 14
     });
}


function AnimatedMarker(title) {
	this.buffer = [];
	this.polylinePoints = []; 
	this.animatedTo = 0;
	this.playing = false;
	this.gmarker = new google.maps.Marker({
	    map: map,
	    title: title,
		icon: {
	    	path: google.maps.SymbolPath.CIRCLE,
			scale: 10,
			fillColor: "#4285F4",
			fillOpacity: 1.0,
			strokeColor: "white",
			strokeOpacity: 1.0,
			strokeWeight: 3
		}
	 });
	 this.gpolyline = new google.maps.Polyline({
		 path: this.polylinePoints,
		 geodesic: false,
		 strokeColor: "#4285F4",
		 strokeOpacity: 0.8,
		 strokeWeight: 5,
		 map: map
	 });
	 this.position = {lat: 0.0, lng: 0.0};
	 
	this.moveTo = function(lat,long,timeRecorded) {
		this.buffer.push({
			"location" : {lat: lat, lng: long},
			"recorded_at"  : timeRecorded
		});
		if (!this.playing) {
			this.play();
		}
	};
	
	this.play = function() {
		if (this.buffer.length > this.animatedTo) {
			var latestPosition = this.buffer[this.animatedTo];
			var recordedDate = new Date(latestPosition["recorded_at"]);
			
			if (this.animatedTo > 0) {
				var previousPosition = this.buffer[this.animatedTo - 1];
				var previousDate = new Date(previousPosition["recorded_at"]);
				
				var timeDelta = recordedDate - previousDate; // ms diff
				this.animate(latestPosition["location"],timeDelta);
			} else {
				this.updatePosition(latestPosition["location"]);
				this.animatedTo = this.animatedTo + 1;
			}
		}
	};
	
	this.updatePosition = function(aPosition) {
		this.polylinePoints.push(aPosition);
		this.position = aPosition;
		this.renderPosition();	
	};
	
	this.renderPosition = function() {
		this.gmarker.setPosition(this.position);
		this.gpolyline.setPath(this.polylinePoints);
	};
	
	this.animate = function(destination, duration) {
		this.animateFrame(destination,duration,1);
	};
	
	this.animateFrame = function(destination, duration, frameNumber) {
		this.playing = true;
		var latDiff = destination.lat - this.position.lat;
		var longDiff = destination.lng - this.position.lng;
		var framesRequired = Math.floor(duration * 3 / 100);
		var latIncrement = latDiff / framesRequired;
		var longIncrement = longDiff / framesRequired;
		var latToAdd = latIncrement * frameNumber;
		var longToAdd = longIncrement * frameNumber;
		var intermediateLat = this.position.lat + latToAdd;
		var intermediateLong = this.position.lng + longToAdd;
		var intermediatePosition = {lat: intermediateLat, lng: intermediateLong};
		this.gmarker.setPosition(intermediatePosition);
		if (follow) {
			map.setCenter(intermediatePosition);
		}
		var t = this;
		if (frameNumber == framesRequired) {
			this.updatePosition(destination);
			this.playing = false;
			this.animatedTo = this.animatedTo + 1;
			setTimeout(function() {
				t.play();
			},0);
			return;
		}
		
		var timePerFrame = duration / framesRequired;
		setTimeout(function() {
			t.animateFrame(destination,duration,frameNumber + 1);
		},timePerFrame);
	};
	
	
}