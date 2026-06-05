type Listener = () => void;
let listeners: Listener[] = [];

export const authEmitter = {
  subscribe: (listener: Listener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },
  emitLogout: () => {
    listeners.forEach(l => l());
  }
};
