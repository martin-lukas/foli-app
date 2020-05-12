const busIcon = "bus.png";
let map;

let busMarkers = [];
let route;
let routeShortName;

let routeShown = false;
let busesShown = false;

resetError();

function resetError() {
    document.getElementById("error").style.display = "none";
    document.getElementById("error").innerHTML = "";
}

function refreshBuses() {
    if (busesShown) {
        clearBuses();
        drawBuses(getBuses());
    }
}

function submitRoute() {
    resetError();
    if (routeShown) {
        clearRoute();
        if (busesShown) {
            clearBuses();
        }
    }
    let busLineInput = document.getElementById("bus-line-input");
    routeShortName = busLineInput.value;
    busLineInput.innerHTML = "";
    let routeId = 0;
    const routesObj = JSON.parse(getHttp("https://data.foli.fi/gtfs/routes"));
    for (i = 0; i < routesObj.length; i++) {
        if (busLineInput.value === routesObj[i].route_short_name) {
            routeId = routesObj[i].route_id;
        }
    }
    const routeTrip = JSON.parse(getHttp("https://data.foli.fi/gtfs/trips/route/" + routeId))[0];
    if (routeTrip === "1") {
        document.getElementById("error").style.display = "block";
        document.getElementById("error").innerHTML = "Route with this number doesn't exist.";
        return;
    }
    const trips = JSON.parse(getHttp("https://data.foli.fi/gtfs/shapes/" + routeTrip.shape_id));
    let latLngPair;
    let routeCoordinates = [];
    for (i = 0; i < trips.length; i++) {
        latLngPair = {lat: parseFloat(trips[i].lat), lng: parseFloat(trips[i].lon)};
        routeCoordinates.push(latLngPair);
    }
    drawRoute(routeCoordinates);
    drawBuses(getBuses());
    return false;
}

//  Draws a route on the map based on given coordinates. 
function drawRoute(routeCoordinates) {
    let bounds = new google.maps.LatLngBounds();
    for (i = 0; i < routeCoordinates.length; i++) {
        bounds.extend(routeCoordinates[i]);
    }
    map.fitBounds(bounds);
    let routeLine = new google.maps.Polyline({
        path: routeCoordinates,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2
    });
    routeLine.setMap(map);
    let routeId = document.getElementById("bus-line-input").value;
    route = {
        routeId: routeId,
        routeLine: routeLine
    };
    routeShown = true;
}

function drawBuses(buses) {
    if (buses.length === 0) {
        document.getElementById("error").style.display = "block";
        document.getElementById("error").innerHTML = "No active busMarkers found on this route.";
    } else {
        let busesCoordinates = getBusesCoordinates(buses);
        let marker;
        for (i = 0; i < busesCoordinates.length; i++) {
            marker = new google.maps.Marker({
                position: new google.maps.LatLng(busesCoordinates[i]),
                icon: busIcon,
                map: map
            });
            busMarkers.push(marker);
        }
        busesShown = true;
    }
}

//  Clears a route from the map. Either just the route line or the route id as well.
function clearRoute() {
    route.routeLine.setMap(null);
    routeShown = false;
}

// Clears markers from the map.
function clearBuses() {
    for (var i = 0; i < busMarkers.length; i++) {
        busMarkers[i].setMap(null);
    }
    busMarkers = [];
    busesShown = false;
}

//  Initialize and add the map. Center it to Turku. 
function initMap() {
    var turku = new google.maps.LatLng(60.452, 22.267);
    map = new google.maps.Map(
        document.getElementById('map'), {zoom: 10, center: turku});
}

//  Returns all vehicles from API that are tracked (with parameters for lat and lon) 
function getBuses() {
    let trackableVehicles = [];
    const vmData = JSON.parse(getHttp("https://data.foli.fi/siri/vm"));
    let vehicles = vmData.result.vehicles;
    var listOfVehicles = Object.keys(vehicles);
    for (i = 0; i <  listOfVehicles.length; i++) {
        let vehicle = vehicles[listOfVehicles[i]];
        if (typeof vehicle["publishedlinename"] !== "undefined") {
            trackableVehicles.push(vehicle);
        }
    }
    let buses = [];
    for (i = 0; i < trackableVehicles.length; i++) {
        if (trackableVehicles[i]["publishedlinename"] === routeShortName) {
            buses.push(trackableVehicles[i]);
        }
    }
    return buses;
}

//  Returns busMarkers coordinates from the vehicle objects.
function getBusesCoordinates(buses) {
    var coordinates = [];
    var latLngPair;
    for (i = 0; i < buses.length; i++) {
        latLngPair = {lat: parseFloat(buses[i].latitude), lng: parseFloat(buses[i].longitude)};
        coordinates.push(latLngPair);
    }
    return coordinates;
}

//  Fetches the HTTP response from a URL. 
function getHttp(url) {
    var xhr = new XMLHttpRequest(); // a new request
    xhr.open("GET",url,false);
    xhr.send(null);
    return xhr.responseText;
}

setInterval(refreshBuses, 5000);