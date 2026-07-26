type Listener<T> = (state: T) => void

export class Store<T extends object> {
  private state: T
  private listeners: Set<Listener<T>> = new Set()

  constructor(initialState: T) {
    this.state = initialState
  }

  public getState(): T {
    return this.state
  }

  public setState(partialState: Partial<T> | ((prevState: T) => Partial<T>)): void {
    const nextPartial = typeof partialState === 'function' ? partialState(this.state) : partialState
    this.state = { ...this.state, ...nextPartial }
    this.notify()
  }

  public subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state))
  }
}

export function createStore<T extends object>(initialState: T): Store<T> {
  return new Store<T>(initialState)
}
