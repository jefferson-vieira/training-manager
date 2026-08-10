// Identifies an image by its leading bytes. This is the only trustworthy check
// available: with presigned uploads the API never sees the request that wrote
// the object, so a declared Content-Type is just a claim the client made to
// storage. A signed header constrains a well-behaved client, not a hostile one.
//
// Magic bytes prove the file *starts* like an image, not that it is well-formed.
// That is proportionate here: the bucket serves these to <img> tags and never
// executes them. Full decode-side validation would require an image library on
// the server, which this feature deliberately avoids.
const JPEG = [0xff, 0xd8, 0xff];

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const RIFF = [0x52, 0x49, 0x46, 0x46];

const WEBP = [0x57, 0x45, 0x42, 0x50];

export function isAcceptedImageSignature(bytes: Buffer) {
  if (matchesAt(bytes, JPEG, 0) || matchesAt(bytes, PNG, 0)) {
    return true;
  }

  // WEBP is a RIFF container: "RIFF" at 0, then the size, then "WEBP" at 8.
  return matchesAt(bytes, RIFF, 0) && matchesAt(bytes, WEBP, 8);
}

function matchesAt(bytes: Buffer, signature: number[], offset: number) {
  if (bytes.length < offset + signature.length) {
    return false;
  }

  return signature.every((byte, index) => bytes[offset + index] === byte);
}
