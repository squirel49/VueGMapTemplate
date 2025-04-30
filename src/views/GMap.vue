<template>
    <div class="overlay">
        <input class="autocomplete" id="auto_input" ref="origin_input" v-on:change="oriChanged" placeholder="Origin" type="text"/>
        <input class="autocomplete" id="auto_input" ref="destination_input" v-on:change="destChanged" placeholder="Destination" type="text"/>
    </div>
    <div class="map" ref="mapDivRef"></div>
    <div hidden="true" id="directionsPanel" ref="directionPanelRef" style="float:right"></div>
</template>


<script>
import { ref, onMounted } from "vue";

import { store } from '../store.js';

export default { 
    name: "GMap",
    props: {
        center: { lat: Number, lng: Number },
        zoom: Number
    },
    emits: ['pushWalkProperties', 'addFixedWaypoint', 'markerPlaced', 'transitRouteRendered', 'totalsUpdated'],
    setup(props, {emit}) {
        // Google map object
        const map = ref(null);
        // map element in template
        const mapDivRef = ref(null);

        // origin onject
        const origin = ref(null);
        // destination object
        const destination = ref(null);

        // autocomplete elements in template
        const origin_input = ref(null);
        const destination_input = ref(null);

        // directions panel in template
        const directionPanelRef = ref(null);

        const selected_markers = ref([]);

        // markers currently on map
        var current_markers = [];

        // custom markers
        var custom_markers = {};
        var custom_marker_id = 1;

        // directions currently on map
        var current_transit_directions = [];
        var current_walking_directions = {};

        var origin_directions = {};
        var dest_directions = {};

        var walk_walking_directions = [];
        var confirmed_walking_directions = [];
        
        // used to sort out whether to clear routes in walking mode. 
        var first_of_section = true;

        var summaries = {};

        //var transit_durations = {};

        var map_listener;
        var marker_listeners = [];

        // load in the google map
        onMounted(() => {
            const key = "Insert Google Maps API key here.";

            const googleMapScript = document.createElement("script");
            googleMapScript.setAttribute(
                "src",
                `https://maps.googleapis.com/maps/api/js?key=${key}&callback=initMap&libraries=places`
            );
            googleMapScript.setAttribute("defer", "");
            googleMapScript.setAttribute("async", "");
            document.head.appendChild(googleMapScript);
        });

        //TODO: locator button
        /*
        function locatorButtonPressed() {
            navigator.geolocation.getCurrentPosition(
                position => {
                    console.log(position.coords.latitude);
                    console.log(position.coords.longitude);
                },
                error => {
                    console.log(error.message);
                },
            )
        }
        */
        window.initMap = () => {

            map.value = new window.google.maps.Map(mapDivRef.value, {
                zoom: props.zoom || 14,
                disableDefaultUI: true,
                center: props.center || {'lat': 51.4271745, 'lng': -0.0542696},
                fullScreenControl: false,
                mapId: 'MapID'
            });

            // As we are initiating the map also initialize the autocomplete
            const options = {
                fields: ["formatted_address", "geometry", "name"],
                strictBounds: false,
            };
            const origin_ac = new window.google.maps.places.Autocomplete(origin_input.value, options)
            const destination_ac = new google.maps.places.Autocomplete(destination_input.value, options)

            // listener for origin input
            origin_ac.addListener("place_changed", () => {
                const origin_input = origin_ac.getPlace();
                // any input can registered place change
                if (origin_input.geometry != undefined) {
                    clearMarkers();
                    // create marker object
                    origin.value = origin_input.geometry.location.toJSON();
                    origin.value['title'] = origin_input.name;
                    addMarkers([origin.value]);
                    if (destination.value != null) {
                        addMarkers([destination.value]);
                    }
                }
            });
            // listener for destination input
            destination_ac.addListener("place_changed", () => {
                const destination_input = destination_ac.getPlace();
                // any input can registered place change
                if (destination_input.geometry != undefined) {
                    clearMarkers();
                    // create marker object
                    destination.value = destination_input.geometry.location.toJSON();
                    destination.value['title'] = destination_input.name;
                    addMarkers([destination.value]);
                    if (origin.value != null) {
                        addMarkers([origin.value]);
                    };
                };
            });
        };

        function oriChanged() {
            store.origin_changed = true;
        };

        function destChanged() {
            store.destination_changed = true;
        };

        function allowMarkerPlacing() {
            map_listener = map.value.addListener("click", (e) => {
                placeMarker(e.latLng, map);
            });
        };

        function revokeMarkerPlacing() {
            map_listener.remove();
        };

        function revokeMarkerRemoval() {
            marker_listeners.forEach((e) => e.remove());
        };

        function placeMarker(latLng) {
            const mapMarker = new window.google.maps.Marker({
                map: map.value,
                position: latLng,
                title: custom_marker_id.toString(),
            });

            marker_listeners.push(mapMarker.addListener('click', () => {
                const id_string = mapMarker.title;
                custom_markers[id_string].setMap(null);
                store.chosen_waypoints = store.chosen_waypoints.filter(way => !(Number(id_string) == way.id));
                // re-calculate estimates on marker placing or removal.
                emit('markerPlaced');
            }));
            
            const id_string = custom_marker_id.toString();
            custom_markers[id_string] = mapMarker;

            // let marker_dict = {};
            let marker_dict = {id:custom_marker_id , name: id_string, location: latLng.toJSON()};
            store.chosen_waypoints.push(marker_dict);

            custom_marker_id++;
            emit('markerPlaced');
        };

        function calcMapBounds() {
            const bounds = new window.google.maps.LatLngBounds();

            if (current_markers.length > 1) {
                current_markers.forEach(m=>{ 
                    bounds.extend(m.position);
                });
                map.value.fitBounds(bounds);
            } else {
                map.value.setCenter(current_markers[0].position);
                map.value.setZoom(13);
            };
        };

        function clearMarkers() {
            // clear all markers from map
            current_markers.forEach(m=>{
                // set the marker to point at null map
                m.setMap(null);
            });
            current_markers = [];
        };

        function clearRouteMarkers() {
            // clear all markers except the first two (origin and destination)
            current_markers.slice(2).forEach(m=>{
                m.setMap(null);
            });
        };

        function clearTransitDirections() {
            // clear all directions from map
            current_transit_directions.forEach(d=>{
                d.setMap(null);
            });
        };

        function clearWalkingDirections() {
            // clear all directions from map
            for (let i = 0; i <= store.route_number; i++) {
                current_walking_directions[i].forEach(d=>{
                    d.setMap(null);
                });
            };
        };

        function clearCurrentWalkingDirections() {
            current_walking_directions[store.route_number].forEach(d=>{
                d.setMap(null);
            });
        }

        function clearTransitWalkingDirections() {
            // clear all transit walking directions 
            origin_directions[store.transit_route_id].forEach(d=>{
                d.setMap(null);
            });
            dest_directions[store.transit_route_id].forEach(d=>{
                d.setMap(null);
            });
        };

        function clearOriginDirections() {
            // clear origin walking directions
            origin_directions[store.transit_route_id].forEach(d=>{
                d.setMap(null);
            });
        };

        function clearDestDirections() {
            // clear destination walking directions
            dest_directions[store.transit_route_id].forEach(d=>{
                d.setMap(null);
            });
        };

        function popWalkingDirections() {
            // for a full reset
            current_walking_directions = {};
        };

        function wipeSummaries() {
            for (const route_number in summaries){
                summaries[route_number] = [];
            };
        };

        function fullyClearMap() {
            console.log('clearing map');
            // Fully clear map, used when restarting
            current_markers.forEach(m=>{
                m.setMap(null);
            });
            current_markers = [];
            current_transit_directions.forEach(d=>{
                d.setMap(null);
            });
            for (var i = 1; i < store.route_number; i++) {
                current_walking_directions[i].forEach(d=>{
                    d.setMap(null);
                });
            };
            walk_walking_directions.forEach(d=>{
                d.setMap(null);
            });
            confirmed_walking_directions.forEach(d=>{
                d.setMap(null);
            });

            // re-add origin and destination markers
            if (origin.value != null) {
                addMarkers([origin.value]);
            };
            if (destination.value != null) {
                addMarkers([destination.value]);
            };
        };

        function addMarkers(marker_array) {
            if (!marker_array.length) return;

            marker_array.forEach(marker => {
                if (marker == null) {
                    return;
                };

                let mapMarker;
                // if there is an image, it is a place we have found en-route.
                if ("image" in marker) {
                    const image = {
                        url: marker.image,
                        scaledSize: new google.maps.Size(30, 30)
                    };

                    mapMarker = new window.google.maps.Marker({
                        map: map.value,
                        position: new window.google.maps.LatLng(
                            marker.lat,
                            marker.lng
                        ),
                        title: marker.title,
                        icon:image
                    });
                } else {
                    mapMarker = new window.google.maps.Marker({
                        map: map.value,
                        position: new window.google.maps.LatLng(
                            marker.lat,
                            marker.lng
                        ),
                        title: marker.title
                    });
                };

                // info window
                mapMarker.infoWindow = new window.google.maps.InfoWindow({
                    content: marker.title
                });
                mapMarker.addListener ('click', () => {
                    if (mapMarker.infoWindow !== null) {
                        mapMarker.infoWindow.open(map.value, mapMarker)
                    };
                    selected_markers.value.push(mapMarker);

                    emit('addFixedWaypoint', marker.id);
                });
                current_markers.push(mapMarker);
            });
            calcMapBounds();
        };

        function addPolyline(polyline_path) {
            const pathing = new window.google.maps.Polyline({
                path: polyline_path,
                geodesic: true,
                strokeColor: "#FF0000",
                strokeOpacity: 1.0,
                strokeWeight: 2,
            });
            pathing.setMap(map.value);
        };

        function addTransitDirections(origin, destination, departure_time) {
            // set up directions service and renderer
            const directionsService = new window.google.maps.DirectionsService();
            const directionsRenderer = new window.google.maps.DirectionsRenderer();

            directionsRenderer.setMap(map.value);
            directionsRenderer.setPanel(directionPanelRef.value);


            // Unlike other Google maps services, directions will only take lat and lng values as floats.
            origin['lat'] = parseFloat(origin['lat']);
            origin['lng'] = parseFloat(origin['lng']);

            destination['lat'] = parseFloat(destination['lat']);
            destination['lng'] = parseFloat(destination['lng']);
            //1337675679473
            //1717674060

            const request = {
                origin: origin,
                destination: destination,
                travelMode: 'TRANSIT',
                transitOptions : {
                    // Date in JS needs epoch time in milliseconds and we have to give a date object to directions service.
                    departureTime: new Date(departure_time*1000),
                    modes:['RAIL']
                }
            };

            directionsService.route(request, function(response, status) {
                if (status == 'OK') {
                    directionsRenderer.setDirections(response);
                    current_transit_directions.push(directionsRenderer);

                    const directions = directionsRenderer.getDirections();
                    // transit_durations[store.transit_route_id] = directions.routes[0].legs[i].duration.value;

                    // TODO: emit to re-calc estimates. Not hooked up yet.
                    emit('transitRouteRendered');
                } else {
                    console.log(response);
                }
            });
        };

        function goBack() {
            // remove potential walks and chosen routes
            if(walk_walking_directions.length) {
                walk_walking_directions[walk_walking_directions.length - 1].setMap(null);
                walk_walking_directions.pop();
            };
            // if they selected an element in the next leg we need to pop two.
            if (!first_of_section && walk_walking_directions.length) {
                walk_walking_directions[walk_walking_directions.length - 1].setMap(null);
                walk_walking_directions.pop();
            };
            first_of_section = true;
        };

        function previousWalkingDirections() {
            // leg already rendered, just set maps from null to map
            current_walking_directions[store.route_number].forEach(d=>{
                d.setMap(map.value);
            });
            first_of_section = true;
        };

        function previousOriginDirections() {
            // origin routes already rendered, set maps from null to map
            origin_directions[store.transit_route_id].forEach(d=>{
                d.setMap(map.value);
            });
        };

        function previousDestDirections() {
            // origin routes already rendered, set maps from null to map
            dest_directions[store.transit_route_id].forEach(d=>{
                d.setMap(map.value);
            });
        };

        function addWalkingDirections(origin, destination, waypoints, draggable) {
            // set up directions service and renderer
            const directionsService = new window.google.maps.DirectionsService();
            const directionsRenderer = new window.google.maps.DirectionsRenderer({
                draggable: draggable
            });
            directionsRenderer.setMap(map.value);
            directionsRenderer.setPanel(directionPanelRef.value);
            
            // deal with waypoints
            const dr_waypoints = []
            for (const waypoint of waypoints) {
                dr_waypoints.push({location: new window.google.maps.LatLng(
                        waypoint.location.lat,
                        waypoint.location.lng
                    ), stopover: false});
            };

            // Unlike other Google maps services, directions will only take lat and lng values as floats.
            origin['lat'] = parseFloat(origin['lat']);
            origin['lng'] = parseFloat(origin['lng']);

            destination['lat'] = parseFloat(destination['lat']);
            destination['lng'] = parseFloat(destination['lng']);

            // create request
            const request = {
                    origin: origin,
                    destination: destination,
                    travelMode: 'WALKING',
                    waypoints: dr_waypoints 
            };

            directionsService.route(request, function(response, status) {
                if (status == 'OK') {
                    // we use draggable to determine whether this is all routes being rendered or a selected route.
                    const route_num = store.route_number;

                    if (!(store.route_number in summaries)) {
                        summaries[store.route_number] = [];
                    };

                    if (summaries[store.route_number].includes(response['routes'][0]['summary']) && !draggable) {
                        console.log('too similar to previous route.');
                    } else {
                        directionsRenderer.setDirections(response);

                        // if we are rendering all walks in a route
                        if (!draggable) {

                            if (store.walk_state === 'origin') {
                                if (!(store.transit_route_id in origin_directions)) {
                                    origin_directions[store.transit_route_id] = [];
                                }; 
                                origin_directions[store.transit_route_id].push(directionsRenderer);

                            } else if (store.walk_state === 'walking'){
                                if (!(store.route_number in current_walking_directions)) {
                                    current_walking_directions[store.route_number] = [];
                                };

                                current_walking_directions[store.route_number].push(directionsRenderer);

                            } else {
                                if (!(store.transit_route_id in dest_directions)) {
                                    dest_directions[store.transit_route_id] = [];
                                };
                                dest_directions[store.transit_route_id].push(directionsRenderer);
                            };
                            first_of_section = true;
                        /*
                        } else if (store.walk_state === 'origin') {
                            origin_walking_directions.forEach(d=>{
                                d.setMap(null);
                            });
                            origin_walking_directions.push(directionsRenderer);
                        } else if (store.walk_state === 'walking') {
                            console.log('here');
                            console.log(walk_walking_directions);
                            console.log(first_of_section);
                            if (!first_of_section){
                                console.log('going in here when we shouldnt');
                                walk_walking_directions[walk_walking_directions.length - 1].setMap(null);
                                walk_walking_directions.pop();
                            }
                            walk_walking_directions.push(directionsRenderer);
                            first_of_section = false;
                        } else {
                            destination_walking_directions.forEach(d=>{
                                d.setMap(null);
                            });
                            destination_walking_directions.push(directionsRenderer);
                        }
                        */
                        // otherwise chosen walk is rendered other walks are removed.
                        } else {
                            if (!first_of_section){
                                walk_walking_directions[walk_walking_directions.length - 1].setMap(null);
                                walk_walking_directions.pop();
                            }
                            walk_walking_directions.push(directionsRenderer);
                            first_of_section = false;

                            // update the route totals and add a listener to update when route is updated.
                            var directions = directionsRenderer.getDirections();
                            updateRouteTotals(directions);

                            directionsRenderer.addListener("directions_changed", () => {
                                if (directions) {
                                    updateRouteTotals(directions);
                                };
                            });

                        };
                        summaries[store.route_number].push(response['routes'][0]['summary']);

                        const walk_obj = {
                            'waypoints': waypoints,
                            'origin': origin,
                            'destination': destination,
                            'summary': response['routes'][0]['summary'], 
                            'duration': response['routes'][0]['legs'][0]['duration']['text'],
                            'distance': response['routes'][0]['legs'][0]['distance']['text']
                        };
                        if (!draggable) {
                            emit('pushWalkProperties', walk_obj);
                        };
                    };
                } else {
                    console.log(response);
                };
            });
        };


        function updateRouteTotals(directions) {
            // updates durations and distances as routes are selected and edited.
            let distance_total = 0;
            let duration_total = 0;

            const route = directions.routes[0];

            if (!route) {
                return;
            };

            for (let i = 0; i < route.legs.length; i++) {
                distance_total = route.legs[i].distance.value;
                duration_total = route.legs[i].duration.value;
            };
            // convert to km
            // convert to minutes
            duration_total = Math.round(duration_total/ 60);

            store.durations_dict[store.route_number] = duration_total;
            store.distances_dict[store.route_number] = distance_total;

            emit('totalsUpdated');
        };


        function confirmWalk() {

            // ends up with a bunch of directions renderers pointing at nothing, fix to delete null pointers.

            if (store.walk_state === 'walking') {
                confirmed_walking_directions.concat(walk_walking_directions)
            };

            console.log(confirmed_walking_directions);
        };

        return {
            mapDivRef,
            directionPanelRef,
            origin_input,
            destination_input,
            origin,
            destination,
            oriChanged,
            destChanged,
            calcMapBounds,
            allowMarkerPlacing,
            revokeMarkerPlacing,
            revokeMarkerRemoval,
            selected_markers,
            clearMarkers,
            clearRouteMarkers,
            clearTransitDirections,
            clearWalkingDirections,
            clearCurrentWalkingDirections,
            clearTransitWalkingDirections,
            clearOriginDirections,
            clearDestDirections,
            popWalkingDirections,
            wipeSummaries,
            fullyClearMap,
            addMarkers,
            addPolyline,
            addTransitDirections,
            goBack,
            previousWalkingDirections,
            previousOriginDirections,
            previousDestDirections,
            addWalkingDirections,
            confirmWalk

        };
    }
};

</script>


<style lang="css" scoped>
.map {
    width: 100%;
    height: 100%;
}

.overlay {
    position: absolute;
    z-index: 1;
    left: 5.1%;
    top: 46px;
}

.autocomplete {
    padding: 5px 5px;
    border-radius: 4px;
}

.directionsPanel {
    width: 30%;
    height: 100%;
}
</style>
