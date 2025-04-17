<template>

    <div v-if='transit' id='routes' class="stats-box">
        <ion-card color="primary">
                <ion-card-content>

                    Transit: {{ transit_est_text }}mins <br />
                    Walk: {{ dura_est_text }}min <br />
                    &nbsp;&ensp;&emsp;&emsp;{{ dist_est_text }}km

                </ion-card-content>
        </ion-card>
    </div>
    <div v-else class="stats-box">

        <ion-card color="primary">
                <ion-card-content>
                    {{ dura_est_text }}min <br />
                    {{ dist_est_text }}km
                </ion-card-content>
        </ion-card>

    </div>
</template>

<script>
import { computed, ref, watch } from 'vue';
import { IonCard, IonCardContent, IonCardTitle, IonCardSubtitle, IonCardHeader } from '@ionic/vue';

import  { store } from '../store.js';


export default {
    name: 'route-stats',
    props: ['transit', 'current_transit_route', 'duration', 'distance'],
    components: {
        IonCard,
        IonCardContent,
        IonCardTitle,
        IonCardSubtitle,
        IonCardHeader
    },
    setup(props) {

        const estimate_text = ref('');

        const transit_est_text = computed({
            get() {
                if (Object.keys(props.current_transit_route) === 0) {
                    return "computing";
                } else {
                    return ((Math.round(props.current_transit_route['transit_duration'])).toString());
                };
            }
        });

        const dura_est_text = computed({
            get() {
                if (props.distance['low'] != props.distance['high']) {
                    return (props.duration['low'].toString() + " - " + props.duration['high'].toString());
                } else {
                    return (props.duration['low'].toString());
                };
            }
        });

        const dist_est_text = computed({
            get() {
                if (props.distance['low'] != props.distance['high']) {
                    return (props.distance['low'].toString() + " - " + props.distance['high'].toString());
                } else {
                    return (props.distance['low'].toString());
                };
            }
        });

        watch(store.distances_dict)

        function computeEstimateText() {
        };

        function conputeDuration() { 
            

        };

        return {
            estimate_text,
            transit_est_text,
            dura_est_text,
            dist_est_text,
            computeEstimateText,
            conputeDuration
        }

    }
}
</script>

<style>


</style>