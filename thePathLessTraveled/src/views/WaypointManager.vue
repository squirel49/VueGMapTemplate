<template>
    <div class="waypoint-manager-box">
        <div v-if='store.chosen_waypoints.length>0' id='routes'>

            <ion-list>
                <ion-reorder-group :disabled="store.waypoints_ordered" @ionItemReorder="handleReorder($event)">
                    <ion-item v-for="waypoint in store.chosen_waypoints" :key="waypoint['id']">
                        <ion-button @click="removeWaypoint(waypoint)" shape="round"> <ion-icon aria-hidden="true" slot="icon-only" :icon="closeOutline"></ion-icon> </ion-button>
                        <ion-label>  {{ waypoint['name'] }} </ion-label>
                        <ion-reorder slot="end"></ion-reorder>
                    </ion-item>
                </ion-reorder-group>
            </ion-list>
            <ion-button class="confirm-button" @click="confirmWaypoints()">Confirm Waypoints</ion-button>
        </div>
        <div v-else>
            <ion-list>
                <ion-reorder-group :disabled="true">
                    <ion-item>
                        <ion-label> Choose Waypoints </ion-label>
                        <ion-reorder slot="end"></ion-reorder>
                    </ion-item>
                </ion-reorder-group>
            </ion-list>
            <ion-button class="confirm-button" @click="confirmWaypoints()">I'm Feeling Lucky</ion-button>

        </div>
    </div>
</template>

<script>
import { IonButton, IonIcon, IonItem, IonLabel, IonList, IonReorder, IonReorderGroup } from '@ionic/vue';

import { closeOutline } from 'ionicons/icons';


import { ref } from 'vue';

import { store } from '../store.js';

export default {
    name: 'waypoint-manager',
    emits: ['waypointsConfirmed', 'waypointsChanged'],
    components: {
        IonButton,
        IonIcon,
        IonItem,
        IonLabel,
        IonList,
        IonReorder,
        IonReorderGroup
    },
    setup (props, {emit}) {

        // the modes are:
        // - must pass through all of them
        // - must pass through one of them
        // - preferenced, but can have other routes.
        const waypoint_mode = ref('all');

        const handleReorder = (event) => {
            store.chosen_waypoints = event.detail.complete(store.chosen_waypoints);
            // console.log('After complete', store.chosen_waypoints);
            emit('waypointsChanged');
        };

        const toggleOrder = () => {
            store.waypoints_ordered = !store.waypoints_ordered;
        };

        function removeWaypoint(waypoint_to_remove) {
            store.chosen_waypoints = store.chosen_waypoints.filter(way => !(waypoint_to_remove.id == way.id));
            emit('waypointsChanged');
        };

        function confirmWaypoints() {
            emit('waypointsConfirmed');
        };

        return {
            store,
            closeOutline,
            toggleOrder,
            handleReorder,
            removeWaypoint,
            confirmWaypoints
        }
    }
}
</script>

<style>
.waypoint-manager-box {
    width: 180%;
}

.confirm-button {
    z-index: -1;
}
</style>