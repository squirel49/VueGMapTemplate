import { reactive } from 'vue';

export const store = reactive({
    // can either be walking or transit.
    transit_mode: "walking",

    origin_changed: false,
    destination_changed: false,

    // state to allow reversal
    overall_state: 'start',

    // only used when in transit mode
    walk_state: 'origin',

    transit_route_id : 0,
    // TODO: should be leg number
    route_number: 0,


    // the modes are:
    // - must pass through all of them
    // - must pass through one of them
    // - preferenced, but can have other routes.
    // TODO: currently unused
    waypoint_mode: 'all',

    waypoints_ordered: false,

    chosen_waypoints: [],
    walking_directions: [],

    durations_dict: {},

    distances_dict: {},

    estimates: {},

    /*
    setWaypoints(waypoints_array) {
        this.waypoints = waypoints_array;
    },
    removeWaypoint(id) {
        for (const i=0; i <this.waypoints.length; i++) {
            if (waypoint[i].id == id)  {
                this.waypoints.splice(i, 1);
                break;
            }
        }
    },
    */

});