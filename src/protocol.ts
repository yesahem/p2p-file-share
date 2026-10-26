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
    // Your implementation
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (this.buffer.length < 4) {
      return [];
    }

    // Read the header here.
    const payloadLength = this.buffer.readUInt32BE(0);
    if (payloadLength > MAX_PAYLOAD_SIZE) {
      throw new Error("Payload too large");
    }
    
    if (payloadLength === 0) {
      throw new Error("Empty payload");
    }

    return [];
  }
}
