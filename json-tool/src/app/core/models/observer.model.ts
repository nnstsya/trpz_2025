export interface IObserver {
  update(data: any): void;
}

export interface ISubject {
  attach(observer: IObserver): void;
  detach(observer: IObserver): void;
  notify(): void;
}
