export default class Clock {
    private totalTime: number = 0
    private startTime: number = 0
    private timerId: number
    public uiElement: HTMLElement

    public start(): void {
        this.startTime = performance.now()
        clearInterval(this.timerId)
        this.timerId = setInterval(() => {
            this.updateUI()
        }, 260)
    }

    public getElapsedSeconds(): number {
        return Math.round((this.timerId !== undefined ? (this.totalTime + performance.now() - this.startTime) : (this.totalTime)) / 1000)
    }

    public pause(): void {
        this.totalTime += performance.now() - this.startTime
        clearInterval(this.timerId)
        this.timerId = undefined
        this.updateUI()
    }

    private updateUI(): void {
        if (this.uiElement) {
            const total = this.getElapsedSeconds()
            const seconds = (total % 60) | 0
            const minutes = (total / 60) | 0
            this.uiElement.innerText = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`
        }
    }
}