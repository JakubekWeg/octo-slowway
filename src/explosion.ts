export const bind = (element: HTMLDivElement) => {
    let visible = false
    element.classList.add('gone')
    const images = [...element.getElementsByTagName('img')]
    let n = 0
    setInterval(() => {
        if (!visible) return
        element.style.setProperty('--rotation', `${((Math.random() * 4) | 0) * 90}deg`)
        images[n].classList.remove('visible')
        n = (n + 1) % 3
        images[n].classList.add('visible')
    }, 100)
    return {
        show: (x: number, y: number) => {
            visible = true
            element.style.top = `${y}px`
            element.style.left = `${x}px`
            element.classList.remove('gone')
            setTimeout(() => {
                visible = false
                element.classList.add('gone')
            }, 5000);
        }
    }
}