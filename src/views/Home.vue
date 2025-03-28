<template>
  <ion-menu content-id="main-content">
    <ion-header>
      <ion-toolbar>
        <ion-title>Menu</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <nav>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </ion-content>

  </ion-menu>
  <ion-page id="main-content">
    <ion-content>
      <ion-menu-toggle class="menu-button">
        <ion-button>Menu</ion-button>
      </ion-menu-toggle>

      <ion-fab class="transit-selector" slot="fixed">
        <ion-fab-button>
          <ion-icon :icon="transit_mode_icon"></ion-icon>
        </ion-fab-button>
        <ion-fab-list side="end">
          <ion-fab-button @click="transit_mode_icon='walking'">
            <ion-icon :icon="walkOutline"></ion-icon>
          </ion-fab-button>
          <ion-fab-button @click="transit_mode_icon='transit'" >
            <ion-icon :icon="trainOutline"></ion-icon>
          </ion-fab-button>
        </ion-fab-list>
      </ion-fab>
      <div class="datetime-selector">
        <ion-datetime-button datetime="datetime"></ion-datetime-button>
        <ion-modal :keep-contents-mounted="true">
          <ion-datetime id="datetime" @ionChange="onChange">
          </ion-datetime>
        </ion-modal>
      </div>

      <div class="route-stats-div">
        <route-stats v-if="route_stats" :transit="set_route_type" :current_transit_route="current_tranit_route" :duration="duration_estimate" :distance="distance_estimate"></route-stats>
      </div>

      <!--
      <button @click="testRouteable()">Routable</button>
      <button @click="parentAddMarker()">Marker</button>
      <button @click="testBounds()">boundsTest</button>
      <button @click="parentClearMarkers()">clearMarkers</button>
      <button @click="testPolyline()">Add Polyline</button>
      <button @click="testDirections()">Test Directions</button>
      <button @click="testDirections2()">Test Directions 2</button>
      <button @click="testClearDirections()">Test Clear Directions </button>
      <button @click="testAutocomplete()">Test Autocomplete </button>
      <button @click="testDatetime()">Test Datetime</button>
      -->
      <g-map
        ref="g_map_ref"
        :zoom="14" 
        :center="{'lat': 51.327040, 'lng': -0.227660}"
        v-on:pushWalkProperties="pushWalk"
        v-on:addFixedWaypoint="addWaypoint"
        v-on:transitRouteRendered="getEstimates"
        v-on:markerPlaced="getEstimates"
        v-on:totalsUpdated="consolidateEstimate">
      </g-map>
      <div class="routes">
        <route-selector v-if="train_routed" :routesList="routes" :departureTime="selectedDate" :transit="routes_route_type" v-on:routeChosen="displayRoute" v-on:walkChosen="displayWalk" v-on:transitRouteConfirmed="routeConfirmed" v-on:back="back" v-on:walkingRouteConfirmed="walkConfirmed"></route-selector>
        <waypoint-manager v-if="walking_routed" v-on:waypointsConfirmed="waypointsConfirmed" v-on:waypointsChanged="getEstimates"></waypoint-manager>
      </div>
      <IonButton class="route-button" :disabled="routeable" @click="route()">Route</IonButton>
    </ion-content>
  </ion-page>
</template>

<script>
import { IonContent, IonHeader, IonMenuToggle, IonMenu, IonMenuButton, IonPage, IonIcon, IonFab, 
         IonFabButton, IonFabList, IonTitle, IonButtons, IonToolbar, IonButton, IonDatetimeButton, 
         IonModal, IonDatetime, IonCard, IonCardContent, IonCardSubtitle } from '@ionic/vue';

import { chevronForwardCircle, walkOutline, trainOutline } from 'ionicons/icons'

import { computed, ref } from "vue";
// import { until } from '@vueuse/core';

import { store } from '../store.js';

import GMap from './GMap.vue';
import RouteSelector from './RouteSelector.vue';
import WaypointManager from './WaypointManager.vue';
import RouteStats from './RouteStats.vue'
import { RouterLink } from 'vue-router';

export default{
    name: "Home",
    components: {
      IonContent,
      IonHeader,
      IonMenuToggle,
      IonMenu,
      IonMenuButton,
      IonPage,
      IonFab,
      IonIcon, 
      IonFab, 
      IonFabButton, 
      IonFabList,
      IonTitle,
      IonButtons,
      IonToolbar,
      IonButton,
      IonDatetimeButton,
      IonModal,
      IonDatetime,
      IonCard,
      IonCardContent,
      IonCardSubtitle,

      GMap,
      RouteSelector,
      WaypointManager,
      RouteStats
    },
    setup() {
      // reference to the google map object
      const g_map_ref = ref(null);

      // testing
      const markers = ref([{lat: 51.327040, lng: -0.227660, title:"<strong>Home</strong>"}, {lat: 51.4271, lng: -0.0383, title:"<strong>Issac's</strong>"}])
      const markers2 = ref([{lat: 51.51695758745701, lng:  -0.1769174221255329, title:"Paddington"}])

      //const backend_ip = '127.0.0.1:5000';
      const backend_ip = '13.40.173.100';

      // datetime
      // set to current datetime and remove Z to standardize format 
      const selectedDate = ref(new Date().toISOString().slice(0,-1));
      // datetime buttons
      // const confirm = () => datetime.value.$el.confirm();

      const date_time_changed = ref(false);
      // changed datetime on change of date or time  
      const onChange = (e) => {
        // console.log(e.detail.value);
        selectedDate.value = e.detail.value;
        date_time_changed.value = true;
      };

      // waypoints
      const waypoints = ref([]);
      const waypoints_chosen = ref(store.chosen_waypoints.length>0);

      // keeps track of waypointed walks
      var current_origin;
      var current_destination;

      // routes walking or transit to be displayed.
      const routes = ref([]);
      // stores potential train routes for user to pick from
      const train_routes = ref([]);

      // Keeps track of whether we have routed
      const train_routed = ref(false);
      // keep track of the current route
      const current_tranit_route = ref({});
      // walking route waypoints stored here
      const walking_routes = ref({});

      const walking_routed = ref(false);

      // bool for route stats
      const route_stats = ref(false);
      // var walk_selection_state = "origin";

      // stores dicts of properties for origin walks
      const originDirections = ref({});
      const destinationDirections = ref({});
      const walkingDirections = ref({});

      // estimate for time and duration
      const duration_estimate = ref({});
      const distance_estimate = ref({});


      // transit mode and transit mode icon
      // const transit_mode_ref = ref("walking");
      const transit_mode_icon = computed({
        get() {
          if (store.transit_mode == "walking") {
            return walkOutline;
          } else {
            return trainOutline;
          }
        },
        set(mode) {
          store.transit_mode = mode;
          route_type.value = !route_type.value;
          route_type_changed.value = true;
        }
      });

      // true if transit route, false if walking route.
      // route_type is the currently selected route type by user.
      const route_type = ref(true);
      const route_type_changed = ref(false);
      // set_route_type is the overall route type
      const set_route_type = ref(true);
      // routes_route_type is changing in a transit route to tell routes what to render.
      const routes_route_type = ref(true);


      const first_route = ref(true);

      // Makes sure that routing is possible.
      const routeable = computed({
        get() {
          // disabled if the map is null or if either origin or dest are null
          var routeable_flag = (g_map_ref.value == null || g_map_ref.value.origin == null || g_map_ref.value.destination == null);

          // if it is not the first route, and the origin/ dest are not null we check if anything has changed.
          if (!first_route.value && !routeable_flag) {
            var changed_flag = (route_type_changed.value || (route_type.value && date_time_changed.value) || store.origin_changed || store.destination_changed)
            // if it hasn't changed routable_f needs to be true so button is disabled.
            routeable_flag = !changed_flag
          };
          return routeable_flag;
        }
      });


      // testing functions
      function parentAddMarker() {
        g_map_ref.value.addMarkers(this.markers);
      };

      function testRouteable() {
        console.log(routeable);
      };

      function testBounds() {
        g_map_ref.value.addMarkers(this.markers2);
      };

      function parentClearMarkers() {
        g_map_ref.value.clearMarkers();
      };

      function testPolyline() {
        const polyline = [{lat: 51.327040, lng: -0.227660, title:"<strong>Home</strong>"}, {lat: 51.4271, lng: -0.0383, title:"<strong>Issac's</strong>"}];
        g_map_ref.value.addPolyline(polyline);
      };

      function testDirections() {
        g_map_ref.value.addDirectionsRequest({lat: 51.327040, lng: -0.227660}, {lat: 51.4271, lng: -0.0383}, "WALKING", []);
      };

      function testDirections2() {
        g_map_ref.value.addDirectionsRequest({lat: "51.327040", lng: "-0.227660"}, {lat: "51.4271", lng: "-0.0383"}, "TRANSIT", []);
      };

      function testClearDirections() {
        g_map_ref.value.clearDirections();
      };

      function testAutocomplete() {
        console.log(g_map_ref.value.origin);
        console.log(g_map_ref.value.destination);
        console.log(g_map_ref.value.origin.geometry.location.toString());
        console.log(g_map_ref.value.origin.geometry.location.toJSON());
      };



      function route() {
        first_route.value = false;
        store.origin_changed = false;
        store.destination_changed = false;

        // reset state if we re-route.
        train_routed.value = false;
        walking_routed.value = false;
        route_type_changed.value = false;
        date_time_changed.value = false;

        g_map_ref.value.fullyClearMap();
        store.chosen_waypoints = [];

        routes_route_type.value = route_type.value;
        set_route_type.value = route_type.value;
        if (store.transit_mode === "transit") {
          getStationRoutes();
        } else if (store.transit_mode === "walking") {
          store.walk_state = "walking";
          exploreWalk();
        }
      };


      function back() {
        if (store.walk_state == "walking") {
          if (store.route_number == 0 ) {
            // return to waypoint select
            // reset map
            g_map_ref.value.goBack();
            g_map_ref.value.clearWalkingDirections();
            g_map_ref.value.popWalkingDirections();
            g_map_ref.value.wipeSummaries();
            g_map_ref.value.allowMarkerPlacing();
            // reset directions
            walkingDirections.value = {};

            walking_routed.value = true;
            train_routed.value = false;

          } else {
            g_map_ref.value.goBack();
            g_map_ref.value.clearCurrentWalkingDirections();
            store.route_number -= 1;
            loadNextWaypointWalks();
          };

        } else if (store.walk_state == "origin") {
          g_map_ref.value.goBack();
          g_map_ref.value.clearOriginDirections();
          g_map_ref.value.wipeSummaries();

          routes_route_type.value = true;

          routes.value = train_routes.value;

        } else {
          g_map_ref.value.goBack();
          g_map_ref.value.clearDestDirections();
          g_map_ref.value.wipeSummaries();
          store.walk_state = 'origin';
          store.route_number -= 1;

          loadOriginWalks();
          
        };
      };


      function stripPoint(points) {
        // we strip points becuase certain characters in the name can result in errors when receiving request in backend.
        let new_points;
        if (Array.isArray(points)) {
          new_points = [];
          for (const point of points) {
            const stripped_point = {location:{lat:point.location.lat, lng:point.location.lng}, pid:point.pid};
            new_points.push(stripped_point);
          };
        } else {
          // if not array assume it is a single point
          new_points = {lat:points.lat, lng:points.lng};
        };
        return new_points;
      };


      async function exploreWalk() {
        // remove title in case it contains "&"
        const request_str = "http://" + backend_ip + "/get_walk_waypoints?" + "date_time=" + JSON.stringify(selectedDate.value) + "&origin=" + JSON.stringify(stripPoint(g_map_ref.value.origin)) + "&destination=" + JSON.stringify(stripPoint(g_map_ref.value.destination));
        await fetch(request_str, {credentials: 'include'})
            .then(response => response.json())
            .then(data => {
              waypoints.value = data;
              // routes.value=data;
            })
            .catch(error => console.error('Error:', error));
        
        let walk_markers = [];

        let id_counter = 0;
        waypoints.value.forEach(waypoint => {
          waypoint.id = id_counter++;
          walk_markers.push({lat:waypoint.location.lat, lng:waypoint.location.lng, title:waypoint.name, image:waypoint.icon, id:waypoint.id});
        });

        g_map_ref.value.allowMarkerPlacing();

        g_map_ref.value.addMarkers(walk_markers);
        walking_routed.value = true;

        getEstimates();
      };

      function addWaypoint(id) {
        // When we click an icon on the map, add to chosen waypoints
        for (const waypoint of waypoints.value) {
          if (waypoint.id == id) {
            // Only add the chosen waypoint if it isn't already in chosen waypoints.
            if (!store.chosen_waypoints.find(way => way === waypoint)) {
              store.chosen_waypoints.push(waypoint);
            }
            break;
          };
        };
        getEstimates();
      };

      async function waypointsConfirmed() {
        // waypoints have been confirmed, route through them, with given mode
        const request_str = "http://" + backend_ip + "/alternate_walks?" + "date_time=" + JSON.stringify(selectedDate.value) + "&origin=" + JSON.stringify(stripPoint(g_map_ref.value.origin)) + "&destination=" + JSON.stringify(stripPoint(g_map_ref.value.destination)) + "&waypoints=" + JSON.stringify(stripPoint(store.chosen_waypoints)) + "&waypoint_mode=" + JSON.stringify(store.waypoint_mode) + "&waypoints_ordered=" +JSON.stringify(store.waypoints_ordered);
        await fetch(request_str, {credentials: 'include'})
            .then(response => response.json())
            .then(data => {
              walking_routes.value=data;
              // routes.value=data;
            })
            .catch(error => console.error('Error:', error));

        train_routed.value = true;
        routes_route_type.value = false;

        walking_routed.value = false;
        g_map_ref.value.revokeMarkerPlacing();
        g_map_ref.value.revokeMarkerRemoval();
        loadNextWaypointWalks();
      };


      function loadNextWaypointWalks() {
        // re-run each time we need to load a leg of a walk to render on map.
        store.walk_state = "walking";
        let already_visited_flag = false;
        if (!(store.route_number in walkingDirections.value)) {
          walkingDirections.value[store.route_number] = [];
        } else {
          already_visited_flag = true;
        };

        if (already_visited_flag) {
          // if we have gone back we have already rendered the routes just need to find them again and add them back to the route selector.
          g_map_ref.value.previousWalkingDirections();

        } else {
          const leg = walking_routes.value[store.route_number];
          current_origin = g_map_ref.value.origin;
          current_destination = g_map_ref.value.destination;

          // if a route exists
          if (store.route_number != 0) {
            // try to find the next route
            if (store.route_number-1 in store.chosen_waypoints){
              current_origin = store.chosen_waypoints[store.route_number-1]['location'];
            // if there is no next route we have finished.  
            } else {
              store.walk_state = 'complete';
              // pass back
              walkConfirmed();
              return;
            }
          };

          if (store.route_number+1 < walking_routes.value.length){
            current_destination = store.chosen_waypoints[store.route_number]['location'];
          };
          // add the direct route for given leg first.
          g_map_ref.value.addWalkingDirections(current_origin, current_destination, [], false);
          // then the created routes.
          for (const walk of leg) {
              g_map_ref.value.addWalkingDirections(current_origin, current_destination, walk, false);
          };
        };
        routes.value = walkingDirections.value[store.route_number];
      };


      async function getStationRoutes() {
        // check again as they could have deleted
        if (!(g_map_ref.value.origin instanceof Object & g_map_ref.value.destination instanceof Object)) {
          //TODO: make this an alert although shouldn't be possible.
          console.log('Both origin and destination need to be input');
        } else {
          const request_str = "http://" + backend_ip + "/get_station_routes?" + "date_time=" + JSON.stringify(selectedDate.value) + "&origin=" + JSON.stringify(g_map_ref.value.origin) + "&destination=" + JSON.stringify(g_map_ref.value.destination);
          await fetch(request_str, {credentials: 'include'})
            .then(response => response.json())
            .then(data => {
              // use train_routes to store train routes, 
              // then routes for Route Selector
              train_routes.value=data;
              routes.value=data;
              train_routed.value=true;
            })
            .catch(error => console.error('Error:', error));
        };
        getEstimates();
      };

      function displayRoute(route_id) {
        // {'route_id': '998', 'origin_station': {'name': 'Epsom Downs', 'location': {'lat': '51.3237144', 'lng': '-0.2388468'}, 'pid': 'ChIJowBNel7idUgRA2KaR3spQbI', 'distance_to_loc': 869.2535483171082}, 'destination_station': {'name': 'Sydenham', 'location': {'lat': '51.4271745', 'lng': '-0.0542696'}, 
        //  'pid': 'ChIJcU7qQHwBdkgRWbD3lKFOcU0', 'distance_to_loc': 1103.4123580801272}, 'legs': '2', 'stops': [{'location': {'lat': 51.3793289, 'lng': -0.1018498}, 'name': 'West Croydon'}], 'transit_departure_time': 1717601880, 'transit_duration': '51.46666666666667', 'overall_duration': '85.46666666666667'}
        for (const route_dict of train_routes.value) {
          if (route_id == route_dict['route_id']) {
            current_tranit_route.value = (route_dict);
            break;
          };
        };

        g_map_ref.value.clearRouteMarkers();
        g_map_ref.value.clearTransitDirections();

        g_map_ref.value.addMarkers([current_tranit_route.value['origin_station']['location'], current_tranit_route.value['destination_station']['location']]);
        g_map_ref.value.addTransitDirections(current_tranit_route.value['origin_station']['location'], current_tranit_route.value['destination_station']['location'], current_tranit_route.value['transit_departure_time']);

        store.transit_route_id = route_id;
        getEstimates();
      };

      async function routeConfirmed(route_id) {
        // transit route is confirmed, get walking routes
        // check if route has already been chosen.
        if (!(route_id in walking_routes.value)) {

          // should already assign current transit route in displayRoute().
          if (route_id != current_tranit_route.value['route_id']) {
            // not sure we ever get here
            for (const route_dict of train_routes.value) {
              if (route_id == route_dict['route_id']) {
                current_tranit_route.value = (route_dict);
                break;
              };
            };
            store.transit_route_id = route_id;
          };

          const request_str = "http://" + backend_ip + "/transit_alternate_walks?" + "date_time=" + JSON.stringify(selectedDate.value) + "&origin=" + JSON.stringify(stripPoint(g_map_ref.value.origin)) + "&destination=" + JSON.stringify(stripPoint(g_map_ref.value.destination)) + "&selected_route=" + JSON.stringify(current_tranit_route.value);
          await fetch(request_str, {credentials: 'include'})
              .then(response => response.json())
              .then(data => {
                walking_routes.value[route_id]=data;
                // routes.value=data;
              })
              .catch(error => console.error('Error:', error));
        };
        // wait for user to confirm origin walk
        loadOriginWalks();

        // displayDestinationWalks(route, walking_routes.value[route_id]['destination_walks'])

        /*
        for (const walk_waypoints of walking_routes.value[route_id]['origin_walks']) {
          console.log(walk_waypoints);
          g_map_ref.value.addWalkingDirections(g_map_ref.value.origin, route['origin_station']['location'], walk_waypoints, false);
        }

        for (const walk_waypoints of walking_routes.value[route_id]['destination_walks']) {
          console.log(walk_waypoints);
          g_map_ref.value.addWalkingDirections(route['destination_station']['location'], g_map_ref.value.destination, walk_waypoints, false);
        }
        */
      };


      function distanceCalculator(point1, point2) {
        // Approximate radius of earth in km
        const R = 6373.0

        const lat1 = point1['lat'] * Math.PI/180; // φ, λ in radians
        const lat2 = point2['lat'] * Math.PI/180;
        const dlat = (point2['lat']-point1['lat']) * Math.PI/180;
        const dlng = (point2['lng']-point1['lng']) * Math.PI/180;

        const a = Math.sin(dlat/2) * Math.sin(dlat/2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(dlng/2) * Math.sin(dlng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        const d = R * c * 1000; // in metres

        return d;
      };

      function getEstimates() {
        // 
        if (store.transit_mode === "transit") {

          if (store.transit_route_id != 0) {
            let current_route;
            for (const route of train_routes.value) {
              if (store.transit_route_id == route['route_id']) {
                current_route = route;
                break;
              };
            };

            const origin_distance = current_route['origin_station']['distance_to_loc'];
            const destination_distance = current_route['destination_station']['distance_to_loc'];
            store.distances_dict[0] = origin_distance;
            store.distances_dict[1] = destination_distance;
          } else {
            // TODO: currently only create estimates when a transit route has been chosen, but could estimate purely off of origin and dest.
            /*
            console.log(train_routes.value);
            let route_id;
            let origin_distance;
            let destination_distance;
            for (const route of train_routes.value) {
              // TODO: we need to get the high and low range here and then estimate.
              route_id = route['route_id'];
              origin_distance = route['origin_station']['distance_to_loc'];
              destination_distance = route['destination_station']['distance_to_loc'];

              store.estimates[route_id] = {0: origin_distance, 1: destination_distance};
              store.distances_dict[0] = origin_distance;
              store.distances_dict[1] = destination_distance;
              
            };
            */
          }
        } else if (store.transit_mode === "walking") {

          const origin_loc = stripPoint(g_map_ref.value.origin);
          const dest_loc = stripPoint(g_map_ref.value.destination);
          const waypoint_locs = stripPoint(store.chosen_waypoints);

          // reset dict.
          store.distances_dict = {};

          if (!(waypoint_locs.length>0)) {
            store.distances_dict[0] = distanceCalculator(origin_loc, dest_loc);
          } else {
            // calculate crow flies distance.
            let previous_point = stripPoint(waypoint_locs[0].location);
            store.distances_dict[0] = distanceCalculator(origin_loc, previous_point);
            let stripped_loc;
            let leg_counter = 1;
            for (const loc of waypoint_locs.slice(1)) {
              
              stripped_loc = stripPoint(loc.location);
              store.distances_dict[leg_counter] = distanceCalculator(previous_point, stripped_loc);
              previous_point = stripped_loc;
              leg_counter += 1;
            };
            store.distances_dict[leg_counter] = distanceCalculator(previous_point, dest_loc);

          };
          /*
          console.log(walking_routes.value)

          let leg_num = 0;
          for (const leg of walking_routes.value) {
            let min_distance = 99999;
            let max_distance = 0;
            for (const walk of leg) {
              let distance = 0;
              for (const waypoint of walk) {
                distance += waypoint['start_point_distance'];
              };
              if (distance < min_distance) {
                min_distance = distance;
              };
              if (distance > max_distance) {
                max_distance = distance;
              };
            };
            if (!(min_distance == 0)) {
              store.estimates[leg_num] = [min_distance, max_distance];
            };
            leg_num += 1;
          };
          */
        };
        // start point distance gives straight line distance.
        consolidateEstimate();
      };


      function consolidateEstimate() {

        // arrays of high and low estimates.
        let duration = {low:0, high:0};
        let distance = {low:0, high:0};

        for (let i=0; i < Object.keys(store.distances_dict).length; i++) {
          if (i in store.durations_dict) {
            // if the key exists in durations dict the route has been chosen for this leg.
            duration['low'] += store.durations_dict[i];
            duration['high'] += store.durations_dict[i];
            distance['low'] += store.distances_dict[i];
            distance['high'] += store.distances_dict[i];
          } else {
            // otherwise we just estimate.
            // conversion rate from minutes to meters 72.5
            const straight_line_dis = store.distances_dict[i];
            const low_est = straight_line_dis * 1.2;
            const high_est = straight_line_dis * 1.8;

            distance['low'] += low_est;
            distance['high'] += high_est;
            duration['low'] += low_est/ 72.5;
            duration['high'] += high_est/ 72.5;

          };
        };
        // convert to km and round.
        distance['low'] = (Math.round((distance['low']/ 1000) * 10) / 10).toFixed(1);
        distance['high'] = (Math.round((distance['high']/ 1000) * 10) / 10).toFixed(1);

        duration['low'] = Math.round(duration['low']);
        duration['high'] = Math.round(duration['high']);

        duration_estimate.value = duration;
        distance_estimate.value = distance;
        route_stats.value = true;
      };

      function loadOriginWalks() {
        if (!(store.transit_route_id in originDirections.value)) {
          originDirections.value[store.transit_route_id] = [];

          for (const walk of walking_routes.value[store.transit_route_id]['origin_walks']) {
            g_map_ref.value.addWalkingDirections(g_map_ref.value.origin, current_tranit_route.value['origin_station']['location'], walk, false);
          };

        } else {
          // if the transit route id is already in origin directions then we can assume is already has directions.
          g_map_ref.value.previousOriginDirections()
        };
        routes_route_type.value = false;
        routes.value = originDirections.value[store.transit_route_id];
      };

      function loadDestinationWalks() {
        if (!(store.transit_route_id in destinationDirections.value)){
          destinationDirections.value[store.transit_route_id] = [];

          for (const walk of walking_routes.value[store.transit_route_id]['destination_walks']) {
            g_map_ref.value.addWalkingDirections(current_tranit_route.value['destination_station']['location'], g_map_ref.value.destination, walk, false);
          };

        } else {
          g_map_ref.value.previousDestDirections();
        };
        routes.value = destinationDirections.value[store.transit_route_id];
      };

      function pushWalk(walk) {
        if (store.walk_state === "origin") {
          originDirections.value[store.transit_route_id].push(walk);
        } else if (store.walk_state === "walking") {
          walkingDirections.value[store.route_number].push(walk);
        } else {
          destinationDirections.value[store.transit_route_id].push(walk);
        };
      };

      function displayWalk(summary) {
        // display the chosen walk 
        var current_directions = [];
        if (store.walk_state === "origin") {
          current_directions = originDirections.value[store.transit_route_id];
          g_map_ref.value.clearOriginDirections();
        } else if (store.walk_state === "walking") { 
          current_directions = walkingDirections.value[store.route_number];
          g_map_ref.value.clearCurrentWalkingDirections();
        } else {
          current_directions = destinationDirections.value[store.transit_route_id];
          g_map_ref.value.clearDestDirections();
        };

        for (const walk of current_directions) {
          if (summary == walk['summary']) {
            var walking_dict = walk;
          };
        };

        if (store.walk_state === "origin"){
          g_map_ref.value.addWalkingDirections(g_map_ref.value.origin, current_tranit_route.value['origin_station']['location'], walking_dict['waypoints'], true);
        } else if (store.walk_state === "walking"){
          g_map_ref.value.addWalkingDirections(current_origin, current_destination, walking_dict['waypoints'], true);
        } else {
          store.walk_state = 'destination';
          g_map_ref.value.addWalkingDirections(current_tranit_route.value['destination_station']['location'], g_map_ref.value.destination, walking_dict['waypoints'], true);
        };
      };

      function walkConfirmed() {
        g_map_ref.value.confirmWalk();
        if (store.walk_state === "walking") {
          store.route_number += 1;
          loadNextWaypointWalks();
        } else if (store.walk_state === "origin") {
          store.route_number += 1;
          store.walk_state = "destination";
          loadDestinationWalks();
        } else {
          routes.value = [];
          train_routed.value = false;
          g_map_ref.value.calcMapBounds()
        };
      };


      return {
        g_map_ref,
        onChange,
        confirm,
        selectedDate,
        routes,
        duration_estimate,
        distance_estimate,
        waypoints_chosen,
        train_routes,
        train_routed,
        current_tranit_route,
        route_stats,
        walking_routed,
        markers,
        markers2,
        transit_mode_icon,
        route_type,
        routes_route_type,
        set_route_type,
        routeable,
        route,
        back,
        pushWalk,
        addWaypoint,
        parentAddMarker,
        testRouteable,
        testBounds,
        parentClearMarkers,
        testPolyline,
        testDirections,
        testDirections2,
        testClearDirections,
        testAutocomplete,
        getStationRoutes,
        displayRoute,
        displayWalk,
        waypointsConfirmed,
        routeConfirmed,
        getEstimates,
        consolidateEstimate,
        walkConfirmed,
        chevronForwardCircle,
        walkOutline,
        trainOutline,
        store
      }
    }
}

</script>

<style lang="css" scoped>
.menu-button {
  position: absolute;
  z-index: 1;
  left: 1% ;
  top: 40px;
}

.route-stats-div {
  position: absolute;
  z-index: 1;
  left: 7%;
  top: 120px;
}

.transit-selector {
  position: absolute;
  z-index: 1;
  left: 1.4%;
  top: 90px;
}

.datetime-selector {
  position: absolute;
  z-index: 1;
  left: 7%;
  top: 90px;
}

ion-datetime {
  --background: #fff1f2;
  --background-rgb: 255, 241, 242;

  border-radius: 16px;
  box-shadow: rgba(var(--ion-color-rose-rgb), 0.3) 0px 10px 15px -3px;
}

.route-button {
  position: absolute;
  z-index: 1;
  left: 27%;
  top: 40px;
}

.routes {
  position: absolute;
  z-index: 1;
  right: 12%;
  top: 40px;
}
</style>
