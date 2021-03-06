import { getElements, toggleClasses } from './dom';
const [timerBar] = getElements('#timer-bar');

export default class DrawProgress {
    constructor() {
        this.progress = 100;
        this.isRunning = false;
        this.circle = timerBar;
        this.radius = parseInt(timerBar.getAttribute('r'), 10);
        this.c = 2 * Math.PI * this.radius;
        this.circleDashoffset = window.getComputedStyle(this.circle);
    }

    getPercentage(value) {
        return (( 100 - value ) / 100) * this.c;
    }

    play() {
        this.isRunning = true;
        this.timer = setInterval(() => {
            if (this.circleDashoffset.getPropertyValue('stroke-dashoffset') === '-360px') {
                this.stop();
            }
        }, 1000);
      
    }

    stop() {
        this.isRunning = false;
        clearInterval(this.timer);
        this.timer = null;
    }
   
    setProgress(value) {
        // this.progress = value;
        // console.log('-----', this.getPercentage(value));
        // this.circle.style.strokeDashoffset = this.getPercentage(value);
        
        this.circle.style.strokeDashoffset = this.getPercentage(value);
    }

}
    