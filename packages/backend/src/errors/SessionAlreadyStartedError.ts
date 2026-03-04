export class SessionAlreadyStartedError extends Error {
  constructor(message = 'A session has already been started for this day') {
    super(message);

    this.name = 'SessionAlreadyStartedError';
  }
}
