import { getElements, toggleClasses } from './dom';
const [timerBar] = getElements('#timer-bar');

export default class DrawProgress {
    constructor() {
        this.progress = 100;
        this.isRunning = false;
        this.circle = timerBar;
        this.radius = timerBar.getAttribute('r');
        this.c = Math.PI * (this.radius * 2);
    }

    getPercentage(value) {
        return (( 100 - value ) / 100) * this.c;
    }

    play() {
        this.isRunning = true;
        this.timer = setInterval(() => {
            const val = this.progress - 1/10;
            this.setProgress(val);
        }, 1000);
    }

    stop() {
        this.isRunning = false;
        clearInterval(this.timer);
        this.timer = null;
        this.setProgress(100);
    }

    setProgress(value) {
        this.progress = value;
        console.log('-----', this.getPercentage(value));
        this.circle.style.strokeDashoffset = this.getPercentage(value);
    }
}
    