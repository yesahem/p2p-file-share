export type Message =
  | {
      type: "HELLO";
      peerId: string;
      version: 1;
    }
  | {
      type: "PING";
    }
  | {
      type: "PONG";
  };

const MAX_PAYLOAD_SIZE = 1024 * 1024; // not same as the max file size limit

export function encodeMessage(message: Message): Buffer {
  /*  Requirements:
  1. Accept a Message.
  2. Serialize it to JSON.
  3. Convert the JSON string into a UTF-8 Buffer.
  4. Allocate a 4-byte header.
  5. Write the payload length as a big-endian unsigned integer.
  6. Return a single Buffer containing the header followed by the payload.
  */
  console.log("inside encode message");

  const header = Buffer.alloc(4);

  const serializedPayload = JSON.stringify(message);
  const bufferedData = Buffer.from(serializedPayload, "utf-8");

  console.log(bufferedData);
  console.log("buff Header", header);

  header.writeUInt32BE(bufferedData.length, 0);

  return Buffer.concat([header, bufferedData]);
}

encodeMessage({
  type: "PING",
});

// implementation of Message Decoder
export class MessageDecoder {
  private buffer = Buffer.alloc(0);

  push(chunk: Buffer): Message[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const messages: Message[] = [];

    // A single chunk may contain several frames, so keep reading until
    // only an incomplete frame (or nothing) is left in the buffer.
    while (this.buffer.length >= 4) {
      // Read the header here.
      const payloadLength = this.buffer.readUInt32BE(0);
      if (payloadLength > MAX_PAYLOAD_SIZE) {
        throw new Error("Payload too large");
      }

      if (payloadLength === 0) {
        throw new Error("Empty payload");
      }

      const frameLength = 4 + payloadLength;
      if (this.buffer.length < frameLength) {
        break;
      }

      const payload = this.buffer.subarray(4, frameLength);
      this.buffer = this.buffer.subarray(frameLength);

      messages.push(parseMessage(payload));
    }

    return messages;
  }
}

function parseMessage(payload: Buffer): Message {
  let data: unknown;
  try {
    data = JSON.parse(payload.toString("utf-8"));
  } catch {
    throw new Error("Invalid JSON payload");
  }

  if (typeof data !== "object" || data === null || !("type" in data)) {
    throw new Error("Malformed message");
  }

  switch (data.type) {
    case "HELLO":
      if (
        !("peerId" in data) ||
        typeof data.peerId !== "string" ||
        !("version" in data) ||
        data.version !== 1
      ) {
        throw new Error("Malformed HELLO message");
      }
      return { type: "HELLO", peerId: data.peerId, version: 1 };
    case "PING":
      return { type: "PING" };
    case "PONG":
      return { type: "PONG" };
    default:
      throw new Error(`Unknown message type: ${String(data.type)}`);
  }
}
