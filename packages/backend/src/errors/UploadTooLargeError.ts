export class UploadTooLargeError extends Error {
  constructor(message = 'Upload exceeds the maximum allowed size') {
    super(message);

    this.name = 'UploadTooLargeError';
  }
}
