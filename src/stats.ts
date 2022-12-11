import { CarStats } from "./car";

const roadsToGrip = {
    'dry': [0.6, 0.4],
    'wet': [0.4, 0.15],
    'icy': [0.015, 0.001],
}


const speedToDrag = {
    'fastest': [0.0005, 0.005],
    'faster': [0.001, 0.008],
    'fast': [0.004, 0.01],
    'normal': [0.01, 0.03],
}

const accelerationMap = {
    'slow': 0.002,
    'normal': 0.004,
    'fast': 0.0055,
}


export const makeStats = (roads: keyof typeof roadsToGrip, speed: keyof typeof speedToDrag, acceleration: keyof typeof accelerationMap): CarStats => {

    const stats: CarStats = {
        dragRoad: speedToDrag[speed][0],
        dragGround: speedToDrag[speed][1],
        gripRoad: roadsToGrip[roads][0],
        gripGround: roadsToGrip[roads][1],
        accelerationGround: accelerationMap[acceleration],
        accelerationRoad: accelerationMap[acceleration],
        turnSpeed: 0.002
    }

    return stats
}