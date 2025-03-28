<template>

    <div v-if='transit' id='routes'>
        <li style="list-style-type:none;" v-for="route in routesList" :key="route['route_id']">

            <ion-button @click="routeChosen(route)" expand="block" id="troute-button" class="ion-text-wrap" style="max-width: 400px">
                {{ route['origin_station']['name'] }} ---> {{ route['destination_station']['name'] }} <br />
                
                {{ getChangesText(route) }} <br />

                departs at:
                {{ route['transit_departure_time'] }}<br />
                <!--departure Time:
                {{ departureTime }} -->
                transit duration:
                {{ Math.round(route['transit_duration']) }}minutes <br />
                overall duration:
                {{ Math.round(route['overall_duration']) }}minutes est
            </ion-button>
        </li>

        <ion-button class="confirm-button" @click="confirmTransitRoute()">Confirm Choice</ion-button>
    </div>
    <div v-else>
        <li style="list-style-type:none;" v-for="route in routesList" :key="route['summary']">

        <ion-button @click="walkChosen(route)" expand="block" id="troute-button" class="ion-text-wrap" style="max-width: 400px">
            {{ route['summary'] }}

            {{ Math.round(route['duration']) }}minutes

            {{ route['distance'] }}

        </ion-button>
        </li>
        <ion-button class="back-button" @click="back()"><ion-icon :icon="chevronBackOutline"></ion-icon></ion-button>
        <ion-button class="confirm-button" @click="confirmWalk()">Confirm Choice</ion-button>
    </div>

</template>

<script>
import { IonButton } from '@ionic/vue';
import { ref } from 'vue';

import {
  chevronBackOutline
} from 'ionicons/icons'

export default {
    name: 'route-selector',
    props: ['routesList', 'departureTime', 'transit'],
    emits: ['routeChosen', 'walkChosen', 'transitRouteConfirmed', 'walkingRouteConfirmed', 'back'],
    components: {
        IonButton
    },
    setup (props, {emit}) {

        const chosenRouteID = ref(null);

        function getChangesText(route) {
            let changes = '';
            if (route['stops'].length == 0) {
                changes = 'direct';
            } else {
                changes = 'changes: ' + String(route['stops'].length);
            }
            return changes;
        };

        function back() {
            emit('back');
        };

        function routeChosen(route) {
            emit('routeChosen', route['route_id']);
            chosenRouteID.value = route['route_id'];
        };

        function walkChosen(route) {
            emit('walkChosen', route['summary']);
            chosenRouteID.value = route['summary'];
        };

        function confirmTransitRoute() {
            emit('transitRouteConfirmed', chosenRouteID.value);
        };

        function confirmWalk() {
            console.log('confirming walk buttonm prtessed')
            emit('walkingRouteConfirmed');
        };

        return {
            chevronBackOutline,
            back,
            getChangesText,
            routeChosen,
            walkChosen,
            confirmTransitRoute,
            confirmWalk
        }
    }
}
</script>

<style>
.confirm-button {
    z-index: -1;
}
</style>