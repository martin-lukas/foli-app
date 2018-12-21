var obj = JSON.parse(getHttp("https://data.foli.fi/gtfs/routes"));
var busIcon = "bus.png";
var map;

var buses;
var busesCoordinates = [];
var route;
var routeCoordinates = [];

//  ** FLAGS **
var areBusesDrawn = false;
var isRouteDrawn = false;
var changedSelect = false;
var busesExist = true;

var i;

//  Shows buses on the map 
function showBuses(newRequest) {
    setSelectionFlag();
    var busLineId = document.getElementById("bus-line").value;
    var busLinePublishedName = getRouteShortName(busLineId);
    var trackableVehicles = getTrackableVehicles();
    var buses = [];
    for (i = 0; i < trackableVehicles.length; i++) {
        if (trackableVehicles[i]["publishedlinename"] === busLinePublishedName) {
            buses.push(trackableVehicles[i]);
        }
    }
    if (buses.length === 0) {
        document.getElementById("error").innerHTML = "No active buses found on this route.";
        if (changedSelect) {
            clearRoute(changedSelect);
            clearMarkers(changedSelect);
        }
        busesExist = false;
    } else {
        busesExist = true;
        busesCoordinates = getBusesCoordinates(buses);
        drawBuses(busesCoordinates, newRequest);
    }
}

//  Shows the route on the map 
function showRoute() {
    setSelectionFlag();
    var busLineId = document.getElementById("bus-line").value;
    var routeTrip = JSON.parse(getHttp("https://data.foli.fi/gtfs/trips/route/" + busLineId))[0];
    var trips = JSON.parse(getHttp("https://data.foli.fi/gtfs/shapes/" + routeTrip.shape_id));
    var latLngPair;
    routeCoordinates = [];
    for (i = 0; i < trips.length; i++) {
        latLngPair = {lat: parseFloat(trips[i].lat), lng: parseFloat(trips[i].lon)};
        routeCoordinates.push(latLngPair);
    }
    drawRoute(routeCoordinates);
}

// Refreshes shown bus positions. If there are no buses shown, or there was a change in selection,
// or no buses exist for the route at the moment, it doesn't do anything.
function refresh() {
    setSelectionFlag();
    if (areBusesDrawn && !changedSelect && busesExist) {
        showBuses(false);
    }
}

//  Draws buses on a map from their coordinates. If the pressed button is refresh, it doesn't zoom out.
function drawBuses(busesCoordinates, newRequest) {
    if (areBusesDrawn) {
        clearMarkers(changedSelect);
    }
    if (changedSelect) {
        clearRoute(changedSelect);
    }
    if (busesExist) {
        if (newRequest) {
            var bounds = new google.maps.LatLngBounds();
            var coordinates;
            if (isRouteDrawn) {
                coordinates = routeCoordinates;
            } else {
                coordinates = busesCoordinates;
            }
            for (i = 0; i < coordinates.length; i++) {
                bounds.extend(coordinates[i]);
            }
            map.fitBounds(bounds);
        }
        var routeId = document.getElementById("bus-line").value;
        var markersArray = [];
        var marker;
        for (i = 0; i < busesCoordinates.length; i++) {
            marker = new google.maps.Marker({
                position: new google.maps.LatLng(busesCoordinates[i]),
                icon: busIcon,
                map: map
            });
            markersArray.push(marker);
        }
        buses = {
            routeId: routeId,
            markers: markersArray
        };
        areBusesDrawn = true;
    }
}

//  Draws a route on the map based on given coordinates. 
function drawRoute() {
    if (isRouteDrawn) {
        clearRoute(changedSelect);
    }
    if (changedSelect) {
        if (busesExist) {
            clearMarkers(changedSelect);
        }
    }
    var bounds = new google.maps.LatLngBounds();
    for (i = 0; i < routeCoordinates.length; i++) {
        bounds.extend(routeCoordinates[i]);
    }
    map.fitBounds(bounds);
    var routeLine = new google.maps.Polyline({
        path: routeCoordinates,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2
    });
    isRouteDrawn = true;
    routeLine.setMap(map);
    var routeId = document.getElementById("bus-line").value;
    route = {
        routeId: routeId,
        routeLine: routeLine
    };
}

// Clears markers from the map.
function clearMarkers(clearAll) {
    areBusesDrawn = false;
    if (busesExist) {
        if (typeof buses.markers === "undefined") {
            return;
        }
        var markersArray = buses.markers;
        for (var i = 0; i < markersArray.length; i++) {
            markersArray[i].setMap(null);
        }
        if (clearAll) {
            buses = {};

        } else {
            buses.markers = undefined;
        }
    }
}

//  Clears a route from the map. Either just the route line or the route id as well. 
function clearRoute(clearAll) {
    isRouteDrawn = false;
    if (typeof route.routeLine === "undefined") {
        return;
    }
    route.routeLine.setMap(null);
    if (clearAll) {
        route = {};
    } else {
        route.routeLine = undefined;
    }
}

//  Tests, if a change in selection of route occured since last time pressing a button, and sets the flag accordingly. 
function setSelectionFlag() {
    if ((typeof buses === "undefined") || (typeof route === "undefined")) {
        return;
    }
    var routeId = document.getElementById("bus-line").value;
    changedSelect = !(buses.routeId === routeId || route.routeId === routeId);
    if (changedSelect) {
        document.getElementById("error").innerHTML = "";
    }
}

//  Initialize and add the map. Center it to Turku. 
function initMap() {
    var turku = new google.maps.LatLng(60.452, 22.267);
    map = new google.maps.Map(
        document.getElementById('map'), {zoom: 10, center: turku});
}

//  Fills the select element with route list from the API 
function fillRouteSelect() {
    var busLineSelect = document.getElementById("bus-line");
    busLineSelect.innerHTML = "";
    // sort the routes numerically, not alphabetically
    var sortedObj = obj.sort(function(a, b) {return parseInt(a.route_id) - parseInt(b.route_id)});
    for (i = 0; i < obj.length; i++) {
        var routeId = sortedObj[i].route_id;
        var routeShortName = sortedObj[i].route_short_name;
        var routeLongName = sortedObj[i].route_long_name;
        busLineSelect.insertAdjacentHTML("beforeend", "<option value=\"" + routeId + "\">" +
            routeId + ". (" + routeShortName + ") " + routeLongName +
            "</option>");
    }
}

//  Returns all vehicles from API that are tracked (with parameters for lat and lon) 
function getTrackableVehicles() {
    var trackableVehicles = [];
    var vmData = JSON.parse(getHttp("https://data.foli.fi/siri/vm"));
    var vehicles = vmData.result.vehicles;
    var listOfVehicles = Object.keys(vehicles);
    for (i = 0; i <  listOfVehicles.length; i++) {
        var vehicleObj = vehicles[listOfVehicles[i]];
        if (typeof vehicleObj["publishedlinename"] !== "undefined") {
            trackableVehicles.push(vehicleObj);
        }
    }
    return trackableVehicles;
}

//  Returns buses coordinates from the vehicle objects. 
function getBusesCoordinates(buses) {
    var coordinates = [];
    var latLngPair;
    for (i = 0; i < buses.length; i++) {
        latLngPair = {lat: parseFloat(buses[i].latitude), lng: parseFloat(buses[i].longitude)};
        coordinates.push(latLngPair);
    }
    return coordinates;
}

//  Returns a short name for a route from the ID 
function getRouteShortName(routeId) {
    var shortName;
    for (i = 0; i < obj.length; i++) {
        if (obj[i].route_id === routeId) {
            shortName = obj[i].route_short_name;
        }
    }
    return shortName;
}

//  Fetches the HTTP response from a URL. 
function getHttp(yourUrl) {
    var Httpreq = new XMLHttpRequest(); // a new request
    Httpreq.open("GET",yourUrl,false);
    Httpreq.send(null);
    return Httpreq.responseText;
}