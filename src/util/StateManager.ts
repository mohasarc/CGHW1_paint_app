/**
 * This singleton class is used to manage the state of the whole application
 * Any value that can be used by two different modules should be stored in the
 * state manager and read from it.
 */
export class StateManager {
    static instance: StateManager;
    state: { [id: string]: { val: any, cbs: Function[] } } = {};

    /**
     * @param id The id of the portion of state to subscribe to
     * @param cb A callback that will be called when the state of [id] has changed
     */
    subscribe(id: string, cb: Function): void {
        if (!this.state[id])
            this.state[id] = { val: undefined, cbs: [] }

        this.state[id].cbs = [...this.state[id].cbs, cb];
    }

    /**
     * Returns the value of state at [id]
     * @param id The id of the portion of state to get its value
     * @returns 
     */
    getState(id: string) {
        if (!this.state[id])
            return null;

        return this.state[id].val;
    }

    /**
     * Update the value of state at [id]
     * @param id  The id of the portion of state to set its value
     * @param val The new value
     */
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

    /**
     * Serialize the whole state into a string
     * @returns 
     */
    serialize() {
        const filtered = { ...this.state };
        Object.keys(filtered).forEach((key) => {
            filtered[key].cbs = [];
        });

        return JSON.stringify(filtered);
    }

    /**
     * Initialize the whole state with the derialized data
     * @param data The serialized data to be parsed
     */
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