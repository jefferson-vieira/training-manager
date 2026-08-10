export class InvalidFormatError extends Error {
  constructor(message = 'Unsupported format') {
    super(message);

    this.name = 'InvalidFormatError';
  }
}
