
export class StateManager {
    static instance: StateManager;
    state: { [id: string]: { val: any, cbs: Function[] } } = {};

    /**
     * 
     * @param id 
     * @param cb 
     * @returns 
     */
    subscribe(id: string, cb: Function): boolean {
        if (!this.state[id])
            this.state[id] = { val: undefined, cbs: [] }

        this.state[id].cbs = [...this.state[id].cbs, cb];
        return true;
    }

    getState(id: string) {
        if (!this.state[id])
            return null;

        return this.state[id].val;
    }

    setState(id: string, val: any) {
        if (!this.state[id])
            this.state[id] = { val: undefined, cbs: [] }

        this.state[id] = {
            ...this.state[id],
            val
        }

        this.state[id].cbs.forEach((cb) => {
            cb();
        });
    }

    serialize() {
        const filtered = { ...this.state };
        Object.keys(filtered).forEach((key) => {
            filtered[key].cbs = [];
        });

        return JSON.stringify(filtered);
    }

    initWith(data: string) {
        const parsedData = JSON.parse(JSON.parse(data));
        Object.keys(this.state).forEach((key) => {
            if (parsedData[key] !== undefined) {
                this.setState(key, parsedData[key].val)
            } else {
                console.warn('COULDNT FIND DATA');
            }
        });
    }

    static getInstance(): StateManager {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }

        return StateManager.instance;
    }
}